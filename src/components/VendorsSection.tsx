
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const VendorsSection = () => {
  return (
    <section id="vendors" className="py-16 bg-[#F3EDDF]">
      <div className="site-container">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium text-market-brown mb-4 uppercase">
            Our Vendors
          </h2>
          <div className="w-20 h-1 bg-market-orange mx-auto mb-8"></div>
          <p className="text-lg text-market-olive">
            We partner with local growers and makers who share our commitment to quality,
            sustainability, and community.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#f9f7f0] p-6">
              <h3 className="text-xl font-bold text-market-olive mb-3">What We Look For</h3>
              <ul className="space-y-2 text-market-olive/90 list-disc pl-5">
                <li>Local sourcing (within 150 miles)</li>
                <li>Sustainable practices</li>
                <li>Eco-friendly packaging</li>
                <li>Quality products</li>
              </ul>
            </div>

            <div className="bg-[#f9f7f0] p-6">
              <h3 className="text-xl font-bold text-market-olive mb-3">Vendor Categories</h3>
              <ul className="space-y-2 text-market-olive/90 list-disc pl-5">
                <li>Organic produce</li>
                <li>Artisanal foods</li>
                <li>Craft beverages</li>
                <li>Fresh flowers & plants</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-medium text-market-olive mb-8 text-center uppercase">Featured Vendors</h3>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="mb-6">
              {/* Vendor 1 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🌱</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Paradise Farms</h4>
                  <p className="text-sm text-market-olive/90 text-center">Organic vegetables & herbs</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 2 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">☕</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Flow Cafe</h4>
                  <p className="text-sm text-market-olive/90 text-center">Organic coffee & refreshments</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 3 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🍯</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Honeyveil</h4>
                  <p className="text-sm text-market-olive/90 text-center">Raw local honey & bee products</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 4 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🍞</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Sipan Bread</h4>
                  <p className="text-sm text-market-olive/90 text-center">Artisanal sourdough & baked goods</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 5 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🍷</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Tipsy Taps</h4>
                  <p className="text-sm text-market-olive/90 text-center">Craft beverages & local brews</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 6 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🍫</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Antidote Chocolate</h4>
                  <p className="text-sm text-market-olive/90 text-center">Bean-to-bar chocolate treats</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 7 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🧀</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Chevre</h4>
                  <p className="text-sm text-market-olive/90 text-center">Artisanal goat cheese</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 8 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">🍕</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">Yukan Cassava</h4>
                  <p className="text-sm text-market-olive/90 text-center">Gluten-free frozen pizzas</p>
                </div>
              </CarouselItem>
              
              {/* Vendor 9 */}
              <CarouselItem className="md:basis-1/3 lg:basis-1/4">
                <div className="bg-[#F9F7F0] p-6 h-full">
                  <div className="aspect-square bg-market-green/10 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-3xl">💐</span>
                  </div>
                  <h4 className="font-bold text-market-olive text-center">MammaMia Florals</h4>
                  <p className="text-sm text-market-olive/90 text-center">Fresh-cut flowers & arrangements</p>
                </div>
              </CarouselItem>
            </CarouselContent>
            
            <div className="mt-8 flex justify-center gap-4">
              <CarouselPrevious className="static" />
              <CarouselNext className="static" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default VendorsSection;
