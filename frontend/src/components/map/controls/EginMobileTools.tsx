"use client";

import React, { useState } from "react";
import s from "../styles/egin-map.module.css";
import type { ToolDef } from "./EginToolbar";

interface EginMobileToolsProps {
  tools: ToolDef[];
}

/**
 * Mobile floating tools panel.
 * Shows a FAB toggle (bottom-right) that expands a horizontal scroll panel.
 * Hidden on desktop via the parent — show only when lg: breakpoint is not met.
 */
const EginMobileTools: React.FC<EginMobileToolsProps> = ({ tools }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <div className={s.mobileToolsPanel}>
          <div className={s.mobileToolsScroll}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  tool.onClick();
                  setIsOpen(false);
                }}
                className={tool.danger ? s.mobileToolBtnDanger : s.mobileToolBtn}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={isOpen ? s.mobileToolsToggleOpen : s.mobileToolsToggle}
      >
        {/* Plus / X icon */}
        <svg viewBox="0 0 18 18" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
          <line x1="9" y1="3" x2="9" y2="15" />
          <line x1="3" y1="9" x2="15" y2="9" />
        </svg>
      </button>
    </>
  );
};

export default EginMobileTools;
