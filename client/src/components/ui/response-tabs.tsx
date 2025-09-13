import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { YoutubeResponse } from "@shared/schema";

interface ResponseTabsProps {
  response?: YoutubeResponse;
  logs?: string[];
  headers?: Record<string, string>;
}

export default function ResponseTabs({ response, logs = [], headers = {} }: ResponseTabsProps) {
  const [activeTab, setActiveTab] = useState("response");

  if (!response && logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <svg className="mx-auto w-12 h-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="text-muted-foreground">No response yet. Send a request to see results here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="response" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-response"
            >
              Response
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-logs"
            >
              Logs
            </TabsTrigger>
            <TabsTrigger 
              value="headers" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              data-testid="tab-headers"
            >
              Headers
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6">
          <TabsContent value="response" className="mt-0">
            {response ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Badge variant={response.success ? "default" : "destructive"} className="flex items-center space-x-1">
                    {response.success ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>{response.success ? 'Success' : 'Error'}</span>
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span data-testid="text-response-time">
                      Response time: {response.responseTime}ms
                    </span>
                  </div>
                </div>

                {response.success ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground mb-3">Video Summary (TLDR)</h3>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-tldr-content">
                          {response.tldr || 'No summary available'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-card-foreground mb-3">Video Information</h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Video ID:</dt>
                          <dd className="font-mono text-xs" data-testid="text-video-id">{response.videoId}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Title:</dt>
                          <dd className="text-right max-w-48 truncate" data-testid="text-video-title">
                            {response.videoTitle || 'N/A'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Model Used:</dt>
                          <dd data-testid="text-model-used">{response.model}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Transcript Length:</dt>
                          <dd data-testid="text-transcript-length">{response.transcriptLength.toLocaleString()} chars</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                    <p className="text-sm">{response.error || 'An unknown error occurred'}</p>
                  </div>
                )}

                {response.success && response.chapters && response.chapters.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-card-foreground mb-3">Chapters</h3>
                    <div className="space-y-2" data-testid="container-chapters">
                      {response.chapters.map((chapter, index) => (
                        <div 
                          key={index} 
                          className="flex items-start space-x-3 p-3 rounded-lg bg-muted hover:bg-accent transition-colors"
                          data-testid={`chapter-item-${index}`}
                        >
                          <div className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                            {chapter.time}
                          </div>
                          <div className="flex-1 text-sm text-muted-foreground">
                            {chapter.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-card-foreground mb-3">Raw JSON Response</h3>
                  <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto border border-border">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No response data available</p>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-card-foreground">Request Logs</h3>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="container-logs">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className="text-sm text-muted-foreground p-3 bg-muted rounded-lg font-mono"
                      data-testid={`log-entry-${index}`}
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No logs available</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="headers" className="mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground mb-3">Response Headers</h3>
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto" data-testid="text-response-headers">
                  {Object.keys(headers).length > 0 
                    ? Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\n')
                    : 'No headers available'
                  }
                </pre>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
