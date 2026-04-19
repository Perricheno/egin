"use client";

import React from "react";
import s from "../styles/egin-map.module.css";

/** Single tool definition passed in from the parent */
export interface ToolDef {
  id: string;
  label: string;
  /** Inline SVG JSX or icon component */
  icon: React.ReactNode;
  onClick: () => void;
  /** Mark as active (highlighted green) */
  active?: boolean;
  /** Mark as danger (red, e.g. delete) */
  danger?: boolean;
  /** Insert a divider before this tool */
  divider?: boolean;
}

interface EginToolbarProps {
  tools: ToolDef[];
  /** Show on desktop (vertical strip, left side) */
  className?: string;
}

/**
 * Desktop vertical glassmorphism toolbar.
 * Renders inside the map wrapper – all positioning is via CSS Modules.
 * Each button shows a tooltip on hover via `data-tooltip`.
 */
const EginToolbar: React.FC<EginToolbarProps> = ({ tools }) => {
  return (
    <div className={s.toolbar}>
      {tools.map((tool) => (
        <React.Fragment key={tool.id}>
          {tool.divider && <div className={s.toolDivider} />}
          <button
            type="button"
            onClick={tool.onClick}
            className={
              tool.danger
                ? s.toolBtnDanger
                : tool.active
                  ? s.toolBtnActive
                  : s.toolBtn
            }
            data-tooltip={tool.label}
            aria-label={tool.label}
          >
            {tool.icon}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default EginToolbar;
