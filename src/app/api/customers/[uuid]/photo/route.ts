import { CUSTOMERS_API_PATHS } from "@/constants/customers-api";
import type { Customer } from "@/features/customers/types/customer.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest } from "@/lib/server/hmis-api";
import { withBrowserCustomerPhoto } from "@/lib/server/media-url";
import { requireAccessToken } from "@/lib/server/require-access-token";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const { uuid } = await context.params;
    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return bffSuccess({ message: "Choose a client photo." }, 400);
    }

    if (!photo.type.startsWith("image/")) {
      return bffSuccess({ message: "Client photo must be an image." }, 400);
    }

    if (photo.size > MAX_PHOTO_BYTES) {
      return bffSuccess({ message: "Client photo must be 5 MB or smaller." }, 400);
    }

    const upload = new FormData();
    upload.set("photo", photo, photo.name);

    const customer = await hmisApiRequest<Customer>(
      CUSTOMERS_API_PATHS.photo(uuid),
      {
        method: "POST",
        token: auth.accessToken,
        body: upload,
      },
    );

    return bffSuccess(withBrowserCustomerPhoto(customer));
  } catch (error) {
    return bffError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const { uuid } = await context.params;
    const customer = await hmisApiRequest<Customer>(
      CUSTOMERS_API_PATHS.photo(uuid),
      {
        method: "DELETE",
        token: auth.accessToken,
      },
    );

    return bffSuccess(withBrowserCustomerPhoto(customer));
  } catch (error) {
    return bffError(error);
  }
}
