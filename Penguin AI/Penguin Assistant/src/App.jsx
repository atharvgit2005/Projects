import { useState } from 'react';
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Bot, Terminal } from "lucide-react";

export default function PenguinAssistant() {
  const [chapter, setChapter] = useState('');
  const [packageName, setPackageName] = useState('');
  const [commands, setCommands] = useState('');
  const [errorInput, setErrorInput] = useState('');
  const [debugResult, setDebugResult] = useState('');

  const handleStepLoad = async () => {
    try {
      const res = await fetch(`http://localhost:4000/get-steps?package=${packageName}`);
      const data = await res.json();
      setCommands(data.steps.join('\n'));
    } catch {
      setCommands('Error loading steps.');
    }
  };

  const handleDebug = async () => {
    try {
      const res = await fetch('http://localhost:4000/analyze-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorInput }),
      });
      const data = await res.json();
      setDebugResult(data.fix);
    } catch {
      setDebugResult('Error analyzing error.');
    }``
  };

  return (
    <div className="p-6 grid gap-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Bot className="w-8 h-8" /> Penguin Assistant
      </h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">🔧 Start Building</h2>
          <Input placeholder="Enter LFS Chapter (e.g. 5)" value={chapter} onChange={(e) => setChapter(e.target.value)} />
          <Input placeholder="Enter Package Name (e.g. gcc-pass1)" value={packageName} onChange={(e) => setPackageName(e.target.value)} />
          <Button onClick={handleStepLoad}>Load Step</Button>
          {commands && (
            <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">{commands}</pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">🚑 Debug Tool</h2>
          <Textarea placeholder="Paste your error here..." value={errorInput} onChange={(e) => setErrorInput(e.target.value)} />
          <Button variant="secondary" onClick={handleDebug}>Analyze</Button>
          {debugResult && (
            <pre className="bg-red-100 p-3 rounded whitespace-pre-wrap text-red-700">{debugResult}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

