import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, TestTube, Github, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            YouTube TLDR & Chapters Generator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Extract transcripts from YouTube videos and generate AI-powered summaries and chapters without downloading content
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>Fast Processing</span>
              </CardTitle>
              <CardDescription>
                Generate summaries and chapters in seconds using advanced AI models
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-5 h-5 text-primary" />
                <span>No Downloads</span>
              </CardTitle>
              <CardDescription>
                Extract transcripts directly from YouTube without downloading video files
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="w-5 h-5 text-primary" />
                <span>Multiple Models</span>
              </CardTitle>
              <CardDescription>
                Support for various AI models including GPT-5, Gemma, and Llama
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="space-x-4">
            <Link href="/api-tester">
              <Button size="lg" className="px-8">
                <TestTube className="w-5 h-5 mr-2" />
                API Tester
              </Button>
            </Link>
            <Button variant="outline" size="lg" asChild>
              <a 
                href="https://github.com/pipa0309/YouTube-chapters-and-TLDT-without-downloading" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8"
              >
                <Github className="w-5 h-5 mr-2" />
                View Source
              </a>
            </Button>
          </div>

          <Card className="max-w-2xl mx-auto text-left">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Get started with the API in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. API Request</h4>
                  <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
{`GET /api/build?url=https://youtube.com/watch?v=...&lang=ru&model=gpt-5`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Response</h4>
                  <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
{`{
  "success": true,
  "videoId": "...",
  "tldr": "...",
  "chapters": [...]
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
