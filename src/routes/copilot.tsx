import { createFileRoute } from "@tanstack/react-router";
import { Brain, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Shell } from "@/components/app/Shell";
import { ActionCard, PageHeader } from "@/components/app/bits";
import { AGENTS } from "@/lib/agents";
import { askCopilot, SUGGESTED_QUESTIONS, type CopilotAnswer } from "@/lib/copilot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "AI Inventory Copilot — StockPilot AI" },
      {
        name: "description",
        content:
          "Ask what to do today, which SKUs will stock out, where capital is trapped — answered with evidence from your inventory data.",
      },
      { property: "og:title", content: "AI Inventory Copilot — StockPilot AI" },
      {
        property: "og:description",
        content: "A conversational interface to six inventory intelligence agents.",
      },
    ],
  }),
  component: CopilotPage,
});

interface Turn {
  id: number;
  question: string;
  answer: CopilotAnswer | null; // null = thinking
}

function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const id = ++counter.current;
    setTurns((t) => [...t, { id, question: q, answer: null }]);
    setInput("");
    // Small deliberate delay so the agent pipeline is visible in the demo.
    window.setTimeout(() => {
      const answer = askCopilot(q);
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    }, 550);
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Conversational intelligence"
        title="AI Inventory Copilot"
        description="One interface to the whole agent team. Every answer is derived from live inventory maths — coverage, velocity, lead time, expiry and capital — never from guesswork."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="panel flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-3.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
              <Brain className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Inventory Orchestrator</p>
              <p className="text-[11px] text-muted-foreground">Routing to 6 specialised agents</p>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
            {turns.length === 0 ? (
              <div className="mx-auto max-w-md space-y-4 py-10 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <p className="text-sm font-semibold text-foreground">Start with the money question</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Try &ldquo;What should I do today?&rdquo; — the orchestrator will pull findings from every agent and
                  return a ranked action plan with evidence.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {turns.map((turn) => (
              <div key={turn.id} className="space-y-4">
                <div className="flex justify-end">
                  <p className="flex max-w-[80%] items-center gap-2 rounded-2xl rounded-br-sm bg-primary/12 px-4 py-2.5 text-sm text-foreground">
                    <User className="size-3.5 shrink-0 text-primary" />
                    {turn.question}
                  </p>
                </div>

                {turn.answer === null ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="pulse-dot size-2 rounded-full bg-primary" />
                    Orchestrator is consulting agents…
                  </div>
                ) : (
                  <div className="animate-rise space-y-4">
                    <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-raised/60 p-4">
                      <p className="text-sm font-semibold text-foreground">{turn.answer.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{turn.answer.summary}</p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {turn.answer.agents.map((a) => (
                          <span
                            key={a}
                            className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                          >
                            {AGENTS.find((x) => x.id === a)?.name.replace(" Agent", "")}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {turn.answer.metrics.map((m) => (
                          <div key={m.label} className="rounded-lg border border-border bg-background/40 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p>
                            <p
                              className={cn(
                                "num mt-1 text-sm font-semibold",
                                m.tone === "critical" && "text-critical",
                                m.tone === "warning" && "text-warning",
                                m.tone === "positive" && "text-success",
                                (!m.tone || m.tone === "neutral") && "text-foreground",
                              )}
                            >
                              {m.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {turn.answer.findings.map((f, i) => (
                        <ActionCard key={f.id} finding={f} rank={i + 1} />
                      ))}
                    </div>

                    {turn.answer.followUps.length ? (
                      <div className="flex flex-wrap gap-2">
                        {turn.answer.followUps.map((s) => (
                          <button
                            key={s}
                            onClick={() => ask(s)}
                            className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-border/70 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask the inventory copilot"
              placeholder="Ask: What should I do today?"
              className="flex-1 rounded-lg border border-border bg-background/50 px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Send className="size-3.5" /> Ask
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Try asking
            </p>
            <ul className="mt-3 space-y-1.5">
              {SUGGESTED_QUESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => ask(s)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Agent team</p>
            <ul className="mt-3 space-y-3">
              {AGENTS.map((a) => (
                <li key={a.id}>
                  <p className="text-xs font-medium text-foreground">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">{a.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Shell>
  );
}