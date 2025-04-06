import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const scrollToNextSection = () => {
    document.getElementById('about')?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  
  return (
    <section className="relative min-h-[100vh] flex items-center">
      {/* Hero Image with overlay */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-black/25">
          <img 
            src="/hero-market-image.jpg" 
            alt="Flow Farmers Market" 
            className="w-full h-full object-cover opacity-95" 
          />
        </div>
      </div>
      
      {/* Content overlay - add a top padding to account for the navbar height */}
      <div className="site-container py-20 md:py-32 pt-28 flex justify-center z-10 relative">
        <div className="text-center max-w-3xl">
          <h1 className="text-5xl md:text-7xl text-[#F3EDDF] mb-4 uppercase font-roughwell">
            Flow Farmers Market
          </h1>
          <h2 className="text-xl md:text-2xl text-[#F3EDDF] mb-8 uppercase font-generation tracking-wider">
            LOCAL PRODUCE • BITES • BEVS • TUNES • GOOD VIBES
          </h2>
          <button 
            onClick={scrollToNextSection} 
            className="mx-auto flex items-center justify-center border border-[#F3EDDF] text-[#F3EDDF] hover:bg-[#F3EDDF] hover:text-[#545210] rounded-full w-12 h-12 transition-all duration-300 hover:scale-110"
            aria-label="Scroll to next section"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
