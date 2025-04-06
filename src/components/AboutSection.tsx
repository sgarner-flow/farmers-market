
import { Card, CardContent } from "@/components/ui/card";
const AboutSection = () => {
  return <section id="about" className="py-16 bg-market-tan/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium text-market-brown mb-4 uppercase">
            About the Market
          </h2>
          <div className="w-20 h-1 bg-market-orange mx-auto mb-8"></div>
          <p className="text-lg text-market-olive mb-8">
            Join us at the Flow Farmers Market, where we and our friends at Paradise Farms 
            nurture connections through fresh food and shared values. Together, we're supporting 
            sustainable agriculture and boosting opportunities for local businesses right here in Miami.
          </p>
        </div>

        
      </div>
    </section>;
};
export default AboutSection;
