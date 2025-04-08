import React, { useEffect, useState } from "react";

//import "./ContextMenu.css";

const ContextMenu = ({ position, isToggled, buttons, contextMenuRef, closeMenu }) => {
  if (!isToggled) return null;

  return (
    <div
      ref={contextMenuRef}
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "4px",
        zIndex: 1000,
      }}
    >
      {buttons.map((button, index) => (
        <button
          key={index}
          className="button is-small is-fullwidth"
          onClick={(e) => {
            button.onClick(e);
            closeMenu(); // Close the menu after an action
          }}
          style={{ display: button.show === false ? "none" : "block" }}
        >
          {button.icon} {button.text}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;