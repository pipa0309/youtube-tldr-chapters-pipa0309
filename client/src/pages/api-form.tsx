import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { YoutubeResponse } from "@shared/schema";

interface ApiFormProps {
  onResponse?: (response: YoutubeResponse) => void;
  onLogs?: (logs: string[]) => void;
  onHeaders?: (headers: Record<string, string>) => void;
}

export default function ApiForm({ onResponse, onLogs, onHeaders }: ApiFormProps) {
  const [formData, setFormData] = useState({
    url: '',
    lang: 'ru',
    model: 'gpt-5'
  });
  const [enableCache, setEnableCache] = useState(true);
  const [enableLogs, setEnableLogs] = useState(true);
  
  const { toast } = useToast();

  const processVideoMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        url: formData.url,
        lang: formData.lang,
        model: formData.model,
        ...(enableCache ? {} : { nocache: 'true' }),
        ...(enableLogs ? { logs: 'true' } : {})
      });

      const startTime = Date.now();
      
      // Use fetch directly to handle HTTP 400 responses properly
      const response = await fetch(`/api/build?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      // Capture headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      headers['x-response-time'] = `${Date.now() - startTime}ms`;
      
      onHeaders?.(headers);
      
      return data;
    },
    onSuccess: (data) => {
      // Always pass the response to display component, regardless of success/error status
      onResponse?.(data);
      
      // Only show success toast for actually successful responses
      if (data.success) {
        toast({
          title: "Success",
          description: "Video processed successfully"
        });
      } else {
        toast({
          title: "Request Completed",
          description: data.error || "Request completed with errors",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Network Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url) {
      toast({
        title: "Validation Error",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    const logs = [`[INFO] ${new Date().toISOString()} - API request initiated for URL: ${formData.url}`];
    if (enableLogs) {
      logs.push(`[INFO] ${new Date().toISOString()} - Language: ${formData.lang}, Model: ${formData.model}`);
      logs.push(`[INFO] ${new Date().toISOString()} - Cache enabled: ${enableCache}`);
    }
    onLogs?.(logs);

    processVideoMutation.mutate();
  };

  const loadSampleUrl = () => {
    setFormData(prev => ({
      ...prev,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Request</CardTitle>
        <CardDescription>
          Send a YouTube URL to the API for processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL *</Label>
              <div className="flex space-x-2">
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  data-testid="input-youtube-url"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={loadSampleUrl}
                  data-testid="button-load-sample"
                >
                  Sample
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a YouTube video URL to extract transcript and generate summary
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={formData.lang} onValueChange={(value) => setFormData(prev => ({ ...prev, lang: value }))}>
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Russian (ru)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                    <SelectItem value="es">Spanish (es)</SelectItem>
                    <SelectItem value="fr">French (fr)</SelectItem>
                    <SelectItem value="de">German (de)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">LLM Model</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger data-testid="select-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5">GPT-5 (Latest)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gemma2:2b">Gemma 2 (2B)</SelectItem>
                    <SelectItem value="llama3:8b">Llama 3 (8B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enable-cache" 
                  checked={enableCache}
                  onCheckedChange={(checked) => setEnableCache(!!checked)}
                  data-testid="checkbox-enable-cache"
                />
                <Label htmlFor="enable-cache" className="text-sm text-muted-foreground">
                  Enable caching
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="enable-logs" 
                  checked={enableLogs}
                  onCheckedChange={(checked) => setEnableLogs(!!checked)}
                  data-testid="checkbox-enable-logs"
                />
                <Label htmlFor="enable-logs" className="text-sm text-muted-foreground">
                  Detailed logging
                </Label>
              </div>
            </div>
            <Button
              type="submit"
              disabled={processVideoMutation.isPending}
              data-testid="button-submit-request"
            >
              {processVideoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processVideoMutation.isPending ? 'Processing...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
