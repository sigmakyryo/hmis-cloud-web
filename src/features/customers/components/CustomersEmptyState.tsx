import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton } from "@/components/ui/app-buttons";
import { Button } from "@/components/ui/button";
import { ACTIONS } from "@/constants/copy";
import { ListPageBlankState } from "@/features/app-shell/components/page-layout";

type CustomersEmptyStateProps = {
  onAddClient: () => void;
  onSearchMembership?: () => void;
};

export function CustomersEmptyState({
  onAddClient,
  onSearchMembership,
}: CustomersEmptyStateProps) {
  return (
    <ListPageBlankState
      icon="users"
      title="No clients yet"
      description="Register the first client to start visits, appointments, and billing."
      data-testid="customers-empty-state"
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onSearchMembership ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1 rounded-lg px-2"
              aria-label="Search and add by membership number"
              data-testid="membership-search-button"
              onClick={onSearchMembership}
            >
              <AppIcon name="search" size={14} />
              <AppIcon name="add" size={14} />
            </Button>
          ) : null}
          <PageActionButton onClick={onAddClient} data-testid="add-first-client-button">
            <AppIcon name="add" className="size-3.5" />
            {ACTIONS.registerClient}
          </PageActionButton>
        </div>
      }
    />
  );
}
