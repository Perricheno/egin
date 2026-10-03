"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  MapPinned,
  MessageCircle,
  Store,
  Layers,
  CloudSun,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useApi, fmt } from "@/lib/api";
import type { Dashboard as Data, User, Field } from "@/lib/types";
import { Loading, ErrorBox, PageHead } from "./ui";
export function Dashboard({ user }: { user: User }) {
  const [region, setRegion] = useState("");
  const d = useApi<Data>(
    "/dashboard" + (region ? "?region=" + encodeURIComponent(region) : ""),
  );
  const all = useApi<Field[]>("/fields");
  if (d.loading && !d.data) return <Loading />;
  if (d.error) return <ErrorBox message={d.error} onRetry={d.reload} />;
  if (!d.data) return null;
  const data = d.data;
  const warnings = data.analyses.flatMap((a) =>
    a.result.risk.flags.map((f) => ({ ...f, name: a.result.field.name })),
  );
  const soils = data.analyses.filter(
    (a) => a.result.soil.topsoil?.phh2o != null,
  );
  return (
    <div>
      <PageHead
        eyebrow="EGIN / ОБЗОР ХОЗЯЙСТВА"
        title={`Сәлем, ${user.name.split(" ")[0]}`}
        description="Всё, что важно для вашей земли, — перед вами."
        action={
          <Link href="/map" className="button secondary">
            <Plus size={17} />
            Добавить поле
          </Link>
        }
      />
      <div className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">КАЖДОЕ ПОЛЕ ИМЕЕТ ЗНАЧЕНИЕ</span>
          <h2>
            Знайте свою землю.
            <br />
            <em>Растите уверенно.</em>
          </h2>
          <p>
            Погода, почва и геоданные помогают
            <br className="desktop-only" /> принимать обоснованные решения.
          </p>
          <Link href="/map" className="hero-link">
            Открыть карту полей <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="hero-landscape" aria-hidden="true">
          <svg viewBox="0 0 450 280">
            <defs>
              <pattern
                id="rows"
                width="14"
                height="14"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-26)"
              >
                <path
                  d="M0 0V14"
                  stroke="#dce5c8"
                  strokeWidth="2"
                  opacity=".4"
                />
              </pattern>
            </defs>
            <path fill="#738765" d="m-50 130 200-115 148 75-160 130Z" />
            <path fill="#b8bb87" d="m166 232 147-127 167 101-181 113Z" />
            <path fill="#8a9b76" d="m155 0 211-5 91 114-144-22Z" />
            <path fill="url(#rows)" d="M0 0h450v280H0z" />
            <path
              fill="none"
              stroke="#e6e2c1"
              strokeWidth="6"
              d="m-30 102 179-91 165 90 160 90M151 18l-4 101-174 123m172-122 15 115 160 60"
            />
            <path fill="#d7cba2" d="m338 122 114 42 34-115Z" />
            <circle cx="220" cy="171" r="18" fill="#f7f5e8" />
            <path
              d="m212 171 5 5 11-12"
              fill="none"
              stroke="#315d42"
              strokeWidth="3"
            />
          </svg>
          <span>ОТКРЫТЫЕ ДАННЫЕ · РЕАЛЬНЫЕ ПОЛЯ</span>
        </div>
      </div>
      <div className="stats-grid">
        {[
          {
            icon: MapPinned,
            label: "Мои поля",
            value: data.fields_count,
            unit: "полей",
          },
          {
            icon: Layers,
            label: "Общая площадь",
            value: fmt(data.area_ha),
            unit: "га",
          },
          {
            icon: Store,
            label: "Мои объявления",
            value: data.active_listings,
            unit: "активных",
          },
          {
            icon: MessageCircle,
            label: "Сообщения",
            value: data.unread_messages,
            unit: "непрочитанных",
          },
        ].map(({ icon: Icon, label, value, unit }) => (
          <div className="stat" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel fields-overview">
          <div className="section-heading">
            <h2>Ваши поля</h2>
            <Link href="/map" className="text-link">
              На карту <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="section-filter">
            <span className="muted small">Хозяйства и культуры</span>
            <select
              aria-label="Область аналитики"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">Все области</option>
              {[...new Set(all.data?.map((f) => f.region).filter(Boolean))].map(
                (r) => (
                  <option key={r}>{r}</option>
                ),
              )}
            </select>
          </div>
          {data.fields.length ? (
            data.fields.map((f, i) => (
              <Link
                className="dashboard-field"
                href={"/fields/" + f.id}
                key={f.id}
              >
                <div className={`field-thumbnail tone-${i % 3}`}>
                  <FieldShape field={f} />
                </div>
                <div className="field-title">
                  <strong>{f.name}</strong>
                  <span>
                    {f.farm_name} · {f.district || f.region}
                  </span>
                </div>
                <span className="crop-tag">
                  {f.crop_name || "Без культуры"}
                </span>
                <strong className="area-cell">
                  {fmt(f.area_ha)}
                  <small> га</small>
                </strong>
                <ArrowUpRight size={18} />
              </Link>
            ))
          ) : (
            <div className="empty">
              <MapPinned />
              <h3>Здесь появится ваше первое поле</h3>
              <Link className="button primary" href="/map">
                Нарисовать на карте
              </Link>
            </div>
          )}
          <p className="footnote">{data.scope}</p>
        </section>
        <div className="stack">
          <section className="panel season-panel">
            <div className="section-heading">
              <h2>
                <CloudSun size={20} />
                Сигналы сезона
              </h2>
              <span className="count">{warnings.length}</span>
            </div>
            {warnings.length ? (
              warnings.slice(0, 3).map((w, i) => (
                <div className="season-warning" key={i}>
                  <span className={"signal-dot " + w.level} />
                  <div>
                    <strong>{w.name}</strong>
                    <p>{w.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">
                {data.analyses.length
                  ? "В сохранённых анализах погодные пороги не превышены."
                  : "Откройте поле и запустите анализ: здесь появятся погодные предупреждения."}
              </p>
            )}
            <small className="muted">
              По последним сохранённым анализам полей.
            </small>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Почвенная сводка</h2>
              <Layers size={20} />
            </div>
            {soils.length ? (
              <>
                <strong>
                  pH{" "}
                  {fmt(
                    Math.min(...soils.map((a) => a.result.soil.topsoil!.phh2o)),
                    1,
                  )}
                  –
                  {fmt(
                    Math.max(...soils.map((a) => a.result.soil.topsoil!.phh2o)),
                    1,
                  )}
                </strong>
                <p className="muted small">
                  Оценки по {soils.length} полям с сохранённым анализом.
                  Глобальные модели почвы; даты и источники — в профиле поля.
                </p>
              </>
            ) : (
              <p className="muted small">
                После анализа поля здесь появится диапазон pH по доступным
                оценкам.
              </p>
            )}
          </section>
          <section className="assistant-promo">
            <Sparkles size={24} />
            <h2>Спросите у EGIN</h2>
            <p>
              Какая почва? Что посадить? Где найти технику? Ответы — на основе
              ваших данных.
            </p>
            <Link href="/assistant">
              Открыть помощника <ArrowRight size={18} />
            </Link>
          </section>
        </div>
      </div>
      <div className="two-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Структура посевов</h2>
            <span className="tag">га</span>
          </div>
          <div className="crop-chart">
            {Object.entries(data.crops).map(([crop, area], i) => (
              <div key={crop}>
                <div>
                  <span>
                    <i className={"crop-dot tone-" + (i % 3)} />
                    {crop}
                  </span>
                  <strong>{fmt(area)} га</strong>
                </div>
                <div className="chart-track">
                  <i
                    style={{
                      width: `${data.area_ha ? (area / data.area_ha) * 100 : 0}%`,
                      background: ["#376b51", "#99ab78", "#bd9958"][i % 3],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel community-promo">
          <span className="eyebrow">ОПЫТ, КОТОРЫМ ДЕЛЯТСЯ</span>
          <h2>Рядом — целое сообщество</h2>
          <p>
            Обсуждайте сезон с агрономами, находите услуги и партнёров для
            своего хозяйства.
          </p>
          <div className="row">
            <Link href="/community" className="button secondary">
              В сообщество <ArrowUpRight size={17} />
            </Link>
            <Link href="/market" className="text-link">
              На рынок <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
export function FieldShape({ field }: { field: Field }) {
  const coords =
    field.geometry.type === "Polygon"
      ? field.geometry.coordinates[0]
      : field.geometry.coordinates[0][0];
  const xs = coords.map((p) => p[0]),
    ys = coords.map((p) => p[1]);
  const minx = Math.min(...xs),
    miny = Math.min(...ys),
    w = Math.max(...xs) - minx || 1,
    h = Math.max(...ys) - miny || 1;
  return (
    <svg viewBox="0 0 80 65" aria-hidden="true">
      <polygon
        points={coords
          .map(
            (p) =>
              `${12 + ((p[0] - minx) / w) * 56},${53 - ((p[1] - miny) / h) * 41}`,
          )
          .join(" ")}
      />
    </svg>
  );
}
