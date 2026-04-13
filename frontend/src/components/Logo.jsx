import logoImg from "../assets/DataCLlogo.png";
import "../styles/logo.css";
 
export default function Logo({ size = "md", theme = "dark", onClick }) {
  return (
    <div
      className={`logo logo--${size} logo--${theme} ${onClick ? "logo--clickeable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <img
        src={logoImg}
        alt="DataCL"
        className="logo__imagen"
      />
    </div>
  );
}
 