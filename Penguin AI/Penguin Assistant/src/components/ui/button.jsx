export function Button({ children, onClick, variant = "primary" }) {
    const base = "px-4 py-2 rounded text-white font-semibold";
    const styles = variant === "secondary" ? "bg-gray-600" : "bg-blue-600";
  
    return (
      <button
        onClick={onClick}
        className={`${base} ${styles} hover:opacity-90 transition`}
      >
        {children}
      </button>
    );
  }
  