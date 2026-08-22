"use client";

export default function WebGLFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        color: "white",
        padding: 24,
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
        }}
      >
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          Unable to load the 3D experience
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            opacity: 0.7,
            lineHeight: 1.5,
          }}
        >
          Your browser or graphics device could not initialize the gallery. Try
          reloading the page or using an updated browser.
        </p>

        <button
          onClick={handleReload}
          style={{
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
