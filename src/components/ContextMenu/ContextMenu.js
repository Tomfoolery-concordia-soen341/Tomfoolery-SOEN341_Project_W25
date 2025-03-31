import "./ContextMenu.css"

const ContextMenu = ({
                         rightClickItem,
                         positionX,
                         positionY,
                         isToggled,
                         buttons = [],
                         contextMenuRef,
                     }) => {
    return (
        <menu
            style={{
                top: positionY + 2 + "px", // Fixed: Use positionY for top
                left: positionX + 2 + "px", // Fixed: Use positionX for left
            }}
            className={`context-menu ${isToggled ? "Active" : ""}`}
            ref={contextMenuRef}
        >
            {buttons.map((button, index) => {

                if (button.show === false) return null;
                if (button.isSpacer) return <hr key={index} />;

                function handleClick(e) {
                    e.stopPropagation();
                    button.onClick(e, rightClickItem);
                }

                return (
                    <button
                        key={index}
                        onClick={handleClick}
                        className="context-menu-button"
                    >
                        <span>{button.text}</span>
                        <span className="icon">{button.icon}</span>
                    </button>
                );
            })}
        </menu>
    );
};

export default ContextMenu;