import { BFF_CLINICAL_OPD_ROUTES } from "@/constants/api";
import type { ExternalCareDocument } from "@/features/clinical-opd/types/external-care.types";

type ExternalCareDocumentListProps = {
  visitUuid: string;
  encounterUuid: string;
  documents: ExternalCareDocument[];
};

export function ExternalCareDocumentList({
  visitUuid,
  encounterUuid,
  documents,
}: ExternalCareDocumentListProps) {
  if (documents.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1 text-sm">
      {documents.map((document) => (
        <li key={document.uuid}>
          <a
            className="underline"
            href={BFF_CLINICAL_OPD_ROUTES.encounterExternalCareDocumentDownload(
              visitUuid,
              encounterUuid,
              document.uuid,
            )}
          >
            {document.file_name}
          </a>
        </li>
      ))}
    </ul>
  );
}
