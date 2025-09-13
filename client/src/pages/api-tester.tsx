import { useState } from "react";
import Header from "@/components/header";
import ApiForm from "@/components/api-form";
import ResponseTabs from "@/components/response-tabs";
import Sidebar from "@/components/sidebar";
import type { YoutubeResponse } from "@shared/schema";

export default function ApiTester() {
  const [response, setResponse] = useState<YoutubeResponse | undefined>(undefined);
  const [logs, setLogs] = useState<string[]>([]);
  const [headers, setHeaders] = useState<Record<string, string>>({});

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <ApiForm 
              onResponse={setResponse}
              onLogs={setLogs}
              onHeaders={setHeaders}
            />
            <ResponseTabs 
              response={response}
              logs={logs}
              headers={headers}
            />
          </div>
          
          <div className="lg:col-span-4">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
