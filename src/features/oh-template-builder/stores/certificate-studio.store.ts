import { create } from "zustand";

import {
  applyCofTemplateAiOperations,
  type CofTemplateAiField,
  type CofTemplateAiOperation,
} from "@/features/oh-template-builder/lib/templateAi";
import {
  attachOhCofTemplateSection,
  createOhLibrarySection,
  createOhLibrarySectionItem,
} from "@/features/occupational-health/services/oh.service";
import type { OhResponseField } from "@/features/occupational-health/types";
import { defaultResponseField } from "@/features/settings/components/modules/occupational-health/template-library/responseConfig";

export type StudioField = {
  clientId: string;
  code: string;
  label: string;
  responseType: string;
  options: string;
};

export type StudioSync = "local" | "saving" | "saved";

export type StudioItem = {
  clientId: string;
  serverUuid?: string;
  name: string;
  code: string;
  fields: StudioField[];
  sync: StudioSync;
};

export type StudioSection = {
  clientId: string;
  serverUuid?: string;
  attachmentUuid?: string;
  name: string;
  code: string;
  fields: StudioField[];
  items: StudioItem[];
  sync: StudioSync;
};

type CertificateStudioState = {
  templateUuid: string | null;
  sections: StudioSection[];
  note: string;
  hydrate: (templateUuid: string, sections: StudioSection[]) => void;
  acceptOperation: (templateUuid: string, operation: CofTemplateAiOperation) => void;
  addSection: (templateUuid: string) => void;
  addItem: (templateUuid: string, sectionClientId: string) => void;
  addField: (sectionClientId: string, itemClientId?: string) => void;
  setNote: (note: string) => void;
};

let idle: Promise<void> = Promise.resolve();

/** Resolves after queued section and item saves have finished. */
export function whenStudioIdle(): Promise<void> {
  return idle;
}

function clientId(): string {
  return crypto.randomUUID();
}

function fieldsFromOperation(fields: CofTemplateAiField[] | undefined): StudioField[] {
  if (!fields?.length) {
    return [toStudioField(defaultResponseField("text", { code: "value", label: "Value" }))];
  }
  return fields.map((field) =>
    toStudioField(
      defaultResponseField((field.response_type as "text") || "text", {
        code: (field.code || field.label || "field").toLowerCase(),
        label: field.label || "Field",
      }),
      field.options,
    ),
  );
}

function toStudioField(field: OhResponseField, options?: string): StudioField {
  return {
    clientId: clientId(),
    code: field.code,
    label: field.label,
    responseType: field.response_type,
    options:
      options ||
      field.options.map((option) => option.label).filter(Boolean).join("|"),
  };
}

function enqueue(job: () => Promise<void>): void {
  idle = idle.then(job).catch(() => undefined);
}

export const useCertificateStudioStore = create<CertificateStudioState>((set, get) => ({
  templateUuid: null,
  sections: [],
  note: "",
  setNote: (note) => set({ note }),
  hydrate: (templateUuid, sections) => {
    if (get().templateUuid === templateUuid && get().sections.some((row) => row.sync !== "saved")) {
      return;
    }
    set({ templateUuid, sections });
  },
  acceptOperation: (templateUuid, operation) => {
    const key = operation.client_key || clientId();
    if (operation.type === "create_section") {
      const section: StudioSection = {
        clientId: key,
        name: operation.name || "Section",
        code: (operation.code || "SECTION").toUpperCase(),
        fields: fieldsFromOperation(operation.fields),
        items: [],
        sync: "local",
      };
      set((state) => ({
        templateUuid,
        sections: state.templateUuid === templateUuid ? [...state.sections, section] : [section],
      }));
      enqueue(() => persistSection(templateUuid, key, operation));
      return;
    }
    if (operation.type === "create_item") {
      const sectionCode = (operation.section_code || "").toUpperCase();
      set((state) => ({
        sections: state.sections.map((section) =>
          section.code === sectionCode
            ? {
                ...section,
                items: [
                  ...section.items,
                  {
                    clientId: key,
                    name: operation.name || "Item",
                    code: (operation.code || "ITEM").toUpperCase(),
                    fields: fieldsFromOperation(operation.fields),
                    sync: "local",
                  },
                ],
              }
            : section,
        ),
      }));
      enqueue(() => persistItem(templateUuid, key, sectionCode, operation));
    }
  },
  addSection: (templateUuid) => {
    const key = clientId();
    const section: StudioSection = {
      clientId: key,
      name: "New section",
      code: `SECTION_${get().sections.length + 1}`,
      fields: [toStudioField(defaultResponseField("text", { code: "value", label: "Value" }))],
      items: [],
      sync: "local",
    };
    set((state) => ({ sections: [...state.sections, section] }));
    enqueue(async () => {
      const created = await createOhLibrarySection({
        kind: "cof",
        code: section.code,
        name: section.name,
        default_response_fields: section.fields.map(toResponseField),
      });
      const attachment = await attachOhCofTemplateSection({
        template: templateUuid,
        library_section: created.uuid,
      });
      set((state) => ({
        sections: state.sections.map((row) =>
          row.clientId === key
            ? { ...row, serverUuid: created.uuid, attachmentUuid: attachment.uuid, sync: "saved" }
            : row,
        ),
      }));
    });
  },
  addItem: (templateUuid, sectionClientId) => {
    const section = get().sections.find((row) => row.clientId === sectionClientId);
    if (!section) {
      return;
    }
    const key = clientId();
    const item: StudioItem = {
      clientId: key,
      name: "New item",
      code: `ITEM_${section.items.length + 1}`,
      fields: [toStudioField(defaultResponseField("boolean", { code: "result", label: "Result" }))],
      sync: "local",
    };
    set((state) => ({
      sections: state.sections.map((row) =>
        row.clientId === sectionClientId ? { ...row, items: [...row.items, item] } : row,
      ),
    }));
    enqueue(async () => {
      const current = get().sections.find((row) => row.clientId === sectionClientId);
      if (!current?.serverUuid) {
        return;
      }
      const created = await createOhLibrarySectionItem({
        section: current.serverUuid,
        code: item.code,
        names_i18n: { en: item.name },
        override_response_fields: item.fields.map(toResponseField),
      });
      set((state) => ({
        sections: state.sections.map((row) =>
          row.clientId === sectionClientId
            ? {
                ...row,
                items: row.items.map((entry) =>
                  entry.clientId === key
                    ? { ...entry, serverUuid: created.uuid, sync: "saved" }
                    : entry,
                ),
              }
            : row,
        ),
      }));
      void templateUuid;
    });
  },
  addField: (sectionClientId, itemClientId) => {
    const field = toStudioField(
      defaultResponseField("text", { code: `field_${clientId().slice(0, 4)}`, label: "New field" }),
    );
    set((state) => ({
      sections: state.sections.map((section) => {
        if (section.clientId !== sectionClientId) {
          return section;
        }
        if (!itemClientId) {
          return { ...section, fields: [...section.fields, field], sync: "local" };
        }
        return {
          ...section,
          items: section.items.map((item) =>
            item.clientId === itemClientId
              ? { ...item, fields: [...item.fields, field], sync: "local" }
              : item,
          ),
        };
      }),
    }));
  },
}));

function toResponseField(field: StudioField): OhResponseField {
  const base = defaultResponseField(field.responseType as "text", {
    code: field.code,
    label: field.label,
  });
  if (!field.options) {
    return base;
  }
  return {
    ...base,
    options: field.options.split("|").flatMap((label) => {
      const trimmed = label.trim();
      return trimmed ? [{ code: trimmed.toLowerCase().replaceAll(" ", "_"), label: trimmed }] : [];
    }),
  };
}

async function persistSection(
  templateUuid: string,
  clientKey: string,
  operation: CofTemplateAiOperation,
): Promise<void> {
  useCertificateStudioStore.setState((state) => ({
    sections: state.sections.map((row) =>
      row.clientId === clientKey ? { ...row, sync: "saving" } : row,
    ),
  }));
  const response = await applyCofTemplateAiOperations(templateUuid, {
    operations: [{ ...operation, client_key: clientKey, type: "create_section" }],
  });
  const applied = response.applied[0]?.result as
    | { library_section?: { uuid?: string }; attachment?: { uuid?: string } }
    | undefined;
  useCertificateStudioStore.setState((state) => ({
    sections: state.sections.map((row) =>
      row.clientId === clientKey
        ? {
            ...row,
            serverUuid: applied?.library_section?.uuid ?? row.serverUuid,
            attachmentUuid: applied?.attachment?.uuid ?? row.attachmentUuid,
            sync: "saved",
          }
        : row,
    ),
    note: response.errors?.[0] ?? state.note,
  }));
}

async function persistItem(
  templateUuid: string,
  clientKey: string,
  sectionCode: string,
  operation: CofTemplateAiOperation,
): Promise<void> {
  const section = useCertificateStudioStore
    .getState()
    .sections.find((row) => row.code === sectionCode);
  const response = await applyCofTemplateAiOperations(templateUuid, {
    operations: [
      {
        ...operation,
        client_key: clientKey,
        type: "create_item",
        section_code: sectionCode,
        library_section_uuid: section?.serverUuid,
      },
    ],
  });
  const applied = response.applied[0]?.result as { uuid?: string } | undefined;
  useCertificateStudioStore.setState((state) => ({
    sections: state.sections.map((row) =>
      row.code === sectionCode
        ? {
            ...row,
            items: row.items.map((item) =>
              item.clientId === clientKey
                ? { ...item, serverUuid: applied?.uuid ?? item.serverUuid, sync: "saved" }
                : item,
            ),
          }
        : row,
    ),
  }));
}
