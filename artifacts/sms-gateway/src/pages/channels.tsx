import { useListChannels } from "@workspace/api-client-react";
import { Server, Wifi } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-muted/50 text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ChannelsPage() {
  const { data: channels, isLoading } = useListChannels();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Channels</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Active SMPP and HTTP telco connections configured by the administrator</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))
        ) : channels?.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            <Server className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No channels configured yet.</p>
            <p className="text-xs mt-1">Contact your administrator to set up telco connections.</p>
          </div>
        ) : (
          channels?.map((ch) => (
            <div key={ch.id} className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-2 mb-3">
                {ch.protocol === "SMPP" ? (
                  <Server className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Wifi className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ch.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                      ch.protocol === "SMPP" ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-400/10 text-blue-400 border-blue-400/20"
                    }`}>
                      {ch.protocol}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_STYLES[ch.status]}`}>
                      {ch.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-mono text-foreground">{ch.host}:{ch.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-mono text-foreground">{ch.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{ch.channelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Bindings</span>
                  <span className="font-mono text-foreground">{ch.maxBindings}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
