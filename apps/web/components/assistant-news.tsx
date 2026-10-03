"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  ArrowUpRight,
  Newspaper,
  SlidersHorizontal,
  Check,
  MapPin,
} from "lucide-react";
import { api, useApi, date } from "@/lib/api";
import type { Field, AssistantAnswer, News, Region } from "@/lib/types";
import { Button, Loading, ErrorBox, PageHead } from "./ui";
const prompts = [
  "Какая погода на моём поле?",
  "Какая почва?",
  "Что лучше посадить?",
  "Какие риски на этой неделе?",
  "Покажи мои поля",
  "Найди аренду трактора рядом",
];
export function Assistant() {
  const params = useSearchParams(),
    fs = useApi<Field[]>("/fields"),
    history =
      useApi<
        {
          id: number;
          question: string;
          answer: AssistantAnswer;
          field_id: string | null;
        }[]
      >("/assistant/history");
  const [selected, setSelected] = useState(params.get("field") || ""),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setPending(q);
    setQuestion("");
    setError("");
    try {
      await api<AssistantAnswer>("/assistant", {
        method: "POST",
        body: JSON.stringify({ question: q, field_id: selected || null }),
      });
      history.reload();
      setPending("");
    } catch (e) {
      setError((e as Error).message);
      setQuestion(q);
      setPending("");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.data?.length, pending]);
  return (
    <div className="assistant-page">
      <PageHead
        eyebrow="ВАШИ ДАННЫЕ — ПОНЯТНЫМ ЯЗЫКОМ"
        title="Помощник EGIN"
        description="Погода, почва, культуры и ресурсы рядом."
      />
      <div className="assistant-context">
        <span>
          <MapPin size={17} />
          Контекст поля
        </span>
        <select
          aria-label="Поле для помощника"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Все хозяйства</option>
          {fs.data?.map((f) => (
            <option value={f.id} key={f.id}>
              {f.name} · {f.farm_name}
            </option>
          ))}
        </select>
        <span className="tag">Структурированный помощник</span>
      </div>
      <div className="assistant-intro">
        <div className="assistant-symbol">
          <Sparkles size={28} />
        </div>
        <h2>Разберёмся вместе.</h2>
        <p>
          Помощник вызывает внутренние инструменты и отвечает по сохранённым
          данным.
          <br />
          Свободная генерация LLM не подключена; платный ключ не нужен.
        </p>
        <div className="prompt-grid">
          {prompts.map((p) => (
            <button disabled={busy} key={p} onClick={() => ask(p)}>
              {p}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="assistant-thread">
        {history.loading && !history.data && <Loading />}
        {history.data?.map((h) => (
          <div className="assistant-turn" key={h.id}>
            <div className="user-question">{h.question}</div>
            <div className="assistant-response">
              <Sparkles size={19} />
              <div>
                <p>{h.answer.text}</p>
                <div className="tool-tags">
                  {h.answer.tools.map((t) => (
                    <span key={t}>
                      <Check size={11} />
                      {(
                        {
                          getUserFields: "Мои поля",
                          getFieldWeather: "Погода",
                          getFieldSoil: "Почва",
                          analyzeField: "Анализ поля",
                          searchMarketplace: "Поиск объявлений",
                          getPersonalizedNews: "Новости",
                        } as Record<string, string>
                      )[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {pending && (
          <div className="assistant-turn">
            <div className="user-question">{pending}</div>
            <div className="assistant-response">
              <Sparkles className="pulse" />
              <p>Собираю данные…</p>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      {error && <ErrorBox message={error} />}
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <textarea
          aria-label="Вопрос помощнику"
          placeholder="Спросите о своём поле…"
          rows={2}
          maxLength={2000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          type="submit"
          busy={busy}
          disabled={!question.trim()}
          aria-label="Отправить вопрос"
        >
          <Send size={20} />
        </Button>
      </form>
      <p className="assistant-disclaimer">
        Рекомендации культур основаны на демонстрационной ML-модели. Проверяйте
        решения с агрономом.
      </p>
    </div>
  );
}
export function NewsPage() {
  const news = useApi<News[]>("/news"),
    regions = useApi<Region[]>("/admin/regions"),
    interests = useApi<{ kind: string; value: string }[]>("/interests");
  const [settings, setSettings] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const d = new FormData(e.currentTarget);
    const items = [
      ...d.getAll("topic").map((value) => ({ kind: "topic", value })),
      ...d.getAll("crop").map((value) => ({ kind: "crop", value })),
      ...(d.get("region") ? [{ kind: "region", value: d.get("region") }] : []),
    ];
    try {
      await api("/interests", {
        method: "PUT",
        body: JSON.stringify({ interests: items }),
      });
      interests.reload();
      news.reload();
      setSettings(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageHead
        eyebrow="КОНТЕКСТ ДЛЯ ВАШИХ РЕШЕНИЙ"
        title="Лента хозяйства"
        description="Материалы по вашему региону, культурам и интересам."
        action={
          <Button variant="secondary" onClick={() => setSettings(!settings)}>
            <SlidersHorizontal size={17} />
            Мои интересы
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}{" "}
      {saved && (
        <div className="success" role="status">
          <Check size={17} />
          Интересы сохранены
        </div>
      )}
      {settings && (
        <form onSubmit={save} className="panel interests">
          <h2>Настроить ленту</h2>
          <label>
            Ваш регион
            <select
              name="region"
              defaultValue={
                interests.data?.find((i) => i.kind === "region")?.value || ""
              }
            >
              <option value="">Все регионы</option>
              {regions.data?.map((r) => (
                <option key={r.id}>{r.name_ru}</option>
              ))}
            </select>
          </label>
          <div className="interest-options">
            {[
              { name: "Погода", value: "weather", kind: "topic" },
              { name: "Агрономия", value: "agronomy", kind: "topic" },
              { name: "Почва", value: "soil", kind: "topic" },
              { name: "Техника", value: "machinery", kind: "topic" },
              { name: "Рынок", value: "market", kind: "topic" },
              { name: "Пшеница", value: "wheat", kind: "crop" },
              { name: "Ячмень", value: "barley", kind: "crop" },
              { name: "Подсолнечник", value: "sunflower", kind: "crop" },
            ].map((i) => (
              <label className="checkbox-label" key={i.value}>
                <input
                  type="checkbox"
                  name={i.kind}
                  value={i.value}
                  defaultChecked={interests.data?.some(
                    (x) => x.kind === i.kind && x.value === i.value,
                  )}
                />
                {i.name}
              </label>
            ))}
          </div>
          <Button type="submit" busy={busy}>
            Сохранить интересы
          </Button>
        </form>
      )}
      <div className="news-note">
        <Newspaper size={20} />
        <p>
          В локальной базе есть демонстрационные материалы. Они отмечены «Демо»
          и не выдаются за текущие новости.
        </p>
      </div>
      {news.loading ? (
        <Loading />
      ) : news.error ? (
        <ErrorBox message={news.error} onRetry={news.reload} />
      ) : (
        <div className="news-grid">
          {news.data?.map((n, i) => (
            <article className={"news-card news-tone-" + (i % 3)} key={n.id}>
              <div className="news-card-top">
                <span className="eyebrow">
                  {n.is_demo ? "ДЕМО-МАТЕРИАЛ" : "НОВОСТЬ"}
                </span>
                <Newspaper size={28} strokeWidth={1} />
              </div>
              <div className="news-content">
                <div className="row">
                  {n.tags.map((t) => (
                    <span className="tag" key={t}>
                      {{
                        weather: "Погода",
                        agronomy: "Агрономия",
                        soil: "Почва",
                        market: "Рынок",
                        machinery: "Техника",
                      }[t] || t}
                    </span>
                  ))}
                </div>
                <h2>{n.title}</h2>
                <p>{n.summary}</p>
                <div className="news-footer">
                  <span>
                    {n.source}
                    <small>
                      {n.published_at
                        ? date(n.published_at)
                        : "Учебный материал · без даты события"}
                    </small>
                  </span>
                  {n.external_url && /^https?:\/\//.test(n.external_url) && (
                    <a
                      href={n.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Открыть источник"
                    >
                      <ArrowUpRight size={20} />
                    </a>
                  )}
                </div>
                {n.relevance > 0 && (
                  <small className="relevance">
                    <Check size={12} />
                    Соответствует вашим интересам
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
