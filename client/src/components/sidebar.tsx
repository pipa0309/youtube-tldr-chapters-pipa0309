import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { YoutubeResponse } from "@shared/schema";

interface SidebarProps {
  response?: YoutubeResponse;
}

export default function Sidebar({ response }: SidebarProps) {
  const [config, setConfig] = useState({
    timeout: 30,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000
  });
  
  const { toast } = useToast();

  const exportResponse = () => {
    if (!response) {
      toast({
        title: "No Data",
        description: "No response data to export",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-tldr-${response.videoId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Response exported successfully"
    });
  };

  const copyCurl = () => {
    const curlCommand = `curl -X GET "${window.location.origin}/api/build?url=https://youtube.com/watch?v=..." \\
  -H "Accept: application/json"`;
    
    navigator.clipboard?.writeText(curlCommand).then(() => {
      toast({
        title: "Copied",
        description: "cURL command copied to clipboard"
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint">API Endpoint</Label>
            <Input
              id="api-endpoint"
              value="/api/build"
              className="font-mono text-sm"
              readOnly
              data-testid="input-api-endpoint"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              type="number"
              id="timeout"
              value={config.timeout}
              min="5"
              max="120"
              onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
              data-testid="input-timeout"
            />
          </div>

          <div className="space-y-2">
            <Label>Retry Logic</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enable-retry" 
                  checked={config.enableRetry}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableRetry: !!checked }))}
                  data-testid="checkbox-enable-retry"
                />
                <Label htmlFor="enable-retry" className="text-sm">Enable automatic retries</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  value={config.maxRetries}
                  min="1" 
                  max="10" 
                  placeholder="Max retries"
                  onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                  data-testid="input-max-retries"
                />
                <Input 
                  type="number" 
                  value={config.retryDelay}
                  min="100" 
                  step="100" 
                  placeholder="Delay (ms)"
                  onChange={(e) => setConfig(prev => ({ ...prev, retryDelay: parseInt(e.target.value) }))}
                  data-testid="input-retry-delay"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="secondary" 
            className="w-full justify-start"
            onClick={exportResponse}
            disabled={!response}
            data-testid="button-export-response"
          >
            Export response as JSON
          </Button>
          <Button 
            variant="secondary" 
            className="w-full justify-start"
            onClick={copyCurl}
            data-testid="button-copy-curl"
          >
            Copy as cURL command
          </Button>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-card-foreground mb-2">Parameters</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-mono">url</dt>
                <dd className="text-destructive">required</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-mono">lang</dt>
                <dd className="text-muted-foreground">optional</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground font-mono">model</dt>
                <dd className="text-muted-foreground">optional</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 className="font-medium text-card-foreground mb-2">Response Format</h3>
            <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "videoId": "...",
  "tldr": "...",
  "chapters": [...]
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium text-card-foreground mb-2">Status Codes</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="font-mono">200</dt>
                <dd className="text-muted-foreground">Success</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-mono">400</dt>
                <dd className="text-muted-foreground">Bad Request</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-mono">500</dt>
                <dd className="text-muted-foreground">Server Error</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
