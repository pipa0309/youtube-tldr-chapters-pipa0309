import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, AlertTriangle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptTest {
  method: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

interface TestResult {
  videoId: string;
  videoTitle?: string;
  transcriptTests: TranscriptTest[];
  finalTranscript?: {
    text: string;
    segments: Array<{ start: number; end: number; text: string }>;
    method: string;
  };
  error?: string;
}

export default function YouTubeTester() {
  const [testUrl, setTestUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const runTranscriptTest = async () => {
    if (!testUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/test-transcript?url=${encodeURIComponent(testUrl)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setTestResult(data);
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTranscript = () => {
    if (testResult?.finalTranscript?.text) {
      navigator.clipboard.writeText(testResult.finalTranscript.text);
      toast({
        title: "Copied",
        description: "Transcript copied to clipboard"
      });
    }
  };

  const getStatusIcon = (status: TranscriptTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Spinner className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: TranscriptTest['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Transcript Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-url">YouTube Video URL</Label>
            <div className="flex space-x-2">
              <Input
                id="test-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                data-testid="input-test-url"
              />
              <Button 
                onClick={runTranscriptTest}
                disabled={isLoading}
                data-testid="button-run-test"
              >
                {isLoading && <Spinner className="mr-2 w-4 h-4" />}
                Test
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <Spinner className="w-8 h-8 mx-auto mb-4" />
              <p className="text-muted-foreground">Testing transcript methods...</p>
            </div>
          )}

          {testResult && (
            <div className="space-y-4 mt-6">
              <div>
                <h3 className="font-semibold mb-2">Video Information</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Video ID:</dt>
                    <dd className="font-mono" data-testid="text-test-video-id">{testResult.videoId}</dd>
                  </div>
                  {testResult.videoTitle && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Title:</dt>
                      <dd className="text-right max-w-64 truncate" data-testid="text-test-video-title">
                        {testResult.videoTitle}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Transcript Method Tests</h3>
                <div className="space-y-2">
                  {testResult.transcriptTests.map((test, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`test-method-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <div className="font-medium">{test.method}</div>
                          <div className="text-sm text-muted-foreground">{test.message}</div>
                        </div>
                      </div>
                      {getStatusBadge(test.status)}
                    </div>
                  ))}
                </div>
              </div>

              {testResult.finalTranscript && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Final Transcript</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Method: {testResult.finalTranscript.method}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyTranscript}
                        data-testid="button-copy-transcript"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap" data-testid="text-final-transcript">
                      {testResult.finalTranscript.text.substring(0, 1000)}
                      {testResult.finalTranscript.text.length > 1000 && '...'}
                    </pre>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Length: {testResult.finalTranscript.text.length} characters, 
                    Segments: {testResult.finalTranscript.segments.length}
                  </div>
                </div>
              )}

              {testResult.error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                  <p className="text-sm font-medium">Test Failed</p>
                  <p className="text-sm">{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
