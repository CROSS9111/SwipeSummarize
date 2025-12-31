import { ExternalLink } from "lucide-react";

interface WaitingListItemProps {
  url: string;
  createdAt: string;
}

export function WaitingListItem({ url }: WaitingListItemProps) {
  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace("www.", "");
    } catch {
      return url;
    }
  };

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg group"
    >
      <div className="flex items-start gap-2">
        <ExternalLink className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary">
            {getDomainFromUrl(url)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {url}
          </p>
        </div>
      </div>
    </button>
  );
}