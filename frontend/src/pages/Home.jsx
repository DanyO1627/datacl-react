import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HeroSection from "../components/home/HeroSection";
import RatSection from "../components/home/RatSection";
import PorQueSection from "../components/home/PorQueSection";
import ComoFuncionaSection from "../components/home/ComoFuncionaSection";
 
export default function Home() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <RatSection />
      <PorQueSection />
      <ComoFuncionaSection />
      <Footer />
    </div>
  );
}
 