import { BFF_CLINICAL_OPD_ROUTES } from "@/constants/api";
import type {
  CreateReferenceInput,
  CreateTransferInput,
  ExternalCareDocument,
  ExternalHospitalTransfer,
  ExternalReference,
  ExternalReferenceKind,
  OutsideHospital,
} from "@/features/clinical-opd/types/external-care.types";
import { bffRequest } from "@/lib/bff-client";

type EncounterScope = {
  visitUuid: string;
  encounterUuid: string;
};

export function fetchEncounterOutsideHospitals({
  visitUuid,
  encounterUuid,
}: EncounterScope) {
  return bffRequest<OutsideHospital[]>(
    BFF_CLINICAL_OPD_ROUTES.encounterOutsideHospitals(visitUuid, encounterUuid),
  );
}

export function fetchSettingsOutsideHospitals() {
  return bffRequest<OutsideHospital[]>(BFF_CLINICAL_OPD_ROUTES.outsideHospitals);
}

export function saveSettingsOutsideHospital(
  input: { name: string; town: string; phone: string },
  hospitalUuid?: string,
) {
  if (hospitalUuid) {
    return bffRequest<OutsideHospital>(
      BFF_CLINICAL_OPD_ROUTES.outsideHospital(hospitalUuid),
      { method: "PATCH", body: input },
    );
  }
  return bffRequest<OutsideHospital>(BFF_CLINICAL_OPD_ROUTES.outsideHospitals, {
    method: "POST",
    body: input,
  });
}

export function archiveSettingsOutsideHospital(hospitalUuid: string) {
  return bffRequest<void>(BFF_CLINICAL_OPD_ROUTES.outsideHospital(hospitalUuid), {
    method: "DELETE",
  });
}

export function fetchEncounterReferenceKinds({
  visitUuid,
  encounterUuid,
}: EncounterScope) {
  return bffRequest<ExternalReferenceKind[]>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalReferenceKinds(
      visitUuid,
      encounterUuid,
    ),
  );
}

export function fetchSettingsReferenceKinds() {
  return bffRequest<ExternalReferenceKind[]>(
    BFF_CLINICAL_OPD_ROUTES.externalReferenceKinds,
  );
}

export function saveSettingsReferenceKind(
  input: { label: string; scope: ExternalReferenceKind["scope"] },
  kindUuid?: string,
) {
  if (kindUuid) {
    return bffRequest<ExternalReferenceKind>(
      BFF_CLINICAL_OPD_ROUTES.externalReferenceKind(kindUuid),
      { method: "PATCH", body: input },
    );
  }
  return bffRequest<ExternalReferenceKind>(
    BFF_CLINICAL_OPD_ROUTES.externalReferenceKinds,
    { method: "POST", body: input },
  );
}

export function archiveSettingsReferenceKind(kindUuid: string) {
  return bffRequest<void>(BFF_CLINICAL_OPD_ROUTES.externalReferenceKind(kindUuid), {
    method: "DELETE",
  });
}

export function fetchExternalTransfers({ visitUuid, encounterUuid }: EncounterScope) {
  return bffRequest<ExternalHospitalTransfer[]>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalTransfers(visitUuid, encounterUuid),
  );
}

export function createExternalTransfer(
  scope: EncounterScope,
  input: CreateTransferInput,
) {
  return bffRequest<ExternalHospitalTransfer>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalTransfers(
      scope.visitUuid,
      scope.encounterUuid,
    ),
    { method: "POST", body: input },
  );
}

export function uploadTransferDocument(
  scope: EncounterScope,
  transferUuid: string,
  file: File,
) {
  const body = new FormData();
  body.set("file", file);
  return bffRequest<ExternalCareDocument>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalTransferDocuments(
      scope.visitUuid,
      scope.encounterUuid,
      transferUuid,
    ),
    { method: "POST", body },
  );
}

export function fetchExternalReferences({
  visitUuid,
  encounterUuid,
}: EncounterScope) {
  return bffRequest<ExternalReference[]>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalReferences(visitUuid, encounterUuid),
  );
}

export function createExternalReference(
  scope: EncounterScope,
  input: CreateReferenceInput,
) {
  return bffRequest<ExternalReference>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalReferences(
      scope.visitUuid,
      scope.encounterUuid,
    ),
    { method: "POST", body: input },
  );
}

export function uploadReferenceDocument(
  scope: EncounterScope,
  referenceUuid: string,
  file: File,
) {
  const body = new FormData();
  body.set("file", file);
  return bffRequest<ExternalCareDocument>(
    BFF_CLINICAL_OPD_ROUTES.encounterExternalReferenceDocuments(
      scope.visitUuid,
      scope.encounterUuid,
      referenceUuid,
    ),
    { method: "POST", body },
  );
}
