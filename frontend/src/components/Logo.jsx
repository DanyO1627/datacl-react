import logoImg from "../assets/logo_blanco.png";
import "../styles/logo.css";

export default function Logo({ size = "md", theme = "dark", onClick, src }) {
  const imgSrc = src || logoImg;
  return (
    <div
      className={`logo logo--${size} logo--${theme} ${onClick ? "logo--clickeable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      
      <img
        src={imgSrc}
        alt="DataCL"
        className="logo__imagen"
      />
    </div>
  );
}
