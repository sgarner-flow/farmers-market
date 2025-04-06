
import { MapPin, Calendar, Clock } from "lucide-react";

const MarketDetailsSection = () => {
  return (
    <section id="details" className="py-16 bg-[#F3EDDF]">
      <div className="site-container">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-medium text-market-brown mb-4 text-center uppercase">
            Market Details
          </h2>
          <div className="w-20 h-1 bg-market-orange mx-auto mb-12"></div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="bg-market-green/10 p-3 rounded-full mr-4">
                  <Calendar className="h-6 w-6 text-market-green" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-market-olive mb-2">When We're Open</h3>
                  <p className="text-market-olive/90">
                    Every Sunday<br />
                    10:00 AM - 3:00 PM<br />
                    Year-round
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-market-green/10 p-3 rounded-full mr-4">
                  <MapPin className="h-6 w-6 text-market-green" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-market-olive mb-2">Where To Find Us</h3>
                  <p className="text-market-olive/90">
                    Flow Miami - Downtown Promenade<br />
                    698 NE 1st Avenue<br />
                    Miami, FL 33132
                  </p>
                  <p className="mt-2 text-market-olive/90">
                    Plenty of street parking available.<br />
                    Accessible by public transit.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-market-green/10 p-3 rounded-full mr-4">
                  <Clock className="h-6 w-6 text-market-green" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-market-olive mb-2">Special Events</h3>
                  <p className="text-market-olive/90">
                    First Sunday of the month: Kids activities<br />
                    Second Sunday: Cooking demonstrations<br />
                    Third Sunday: Live local music<br />
                    Last Sunday: Meet the farmers Q&A
                  </p>
                </div>
              </div>
            </div>

            <div className="h-full min-h-[300px]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3592.6878863090513!2d-80.19177082518765!3d25.781651908372736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b69c6a0c2a7d%3A0x62c61489bf56f63c!2s698%20NE%201st%20Ave%2C%20Miami%2C%20FL%2033132!5e0!3m2!1sen!2sus!4v1680123456789!5m2!1sen!2sus" 
                className="w-full h-full rounded-lg border border-market-green/20"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Flow Farmers Market Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketDetailsSection;
