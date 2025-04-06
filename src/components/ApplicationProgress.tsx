
import { Check } from "lucide-react";

type Step = {
  id: number;
  name: string;
  description: string;
};

const steps: Step[] = [
  {
    id: 1,
    name: "Basic Info",
    description: "Business & contact information"
  },
  {
    id: 2,
    name: "Business Information",
    description: "Products & sourcing"
  },
  {
    id: 3,
    name: "Sustainability",
    description: "Environmental practices"
  },
  {
    id: 4,
    name: "Quality Standards",
    description: "Product quality & safety"
  },
  {
    id: 5,
    name: "Community",
    description: "Market engagement"
  },
  {
    id: 6,
    name: "Operational",
    description: "Logistics & commitment"
  },
  {
    id: 7,
    name: "Review & Submit",
    description: "Final submission"
  }
];

interface ApplicationProgressProps {
  currentStep: number;
}

const ApplicationProgress = ({ currentStep }: ApplicationProgressProps) => {
  // Calculate progress percentage
  const progressPercentage = Math.round((currentStep / (steps.length)) * 100);
  
  return (
    <div className="mb-12">
      {/* Progress bar using Tailwind */}
      <div className="mb-6 h-1.5 w-full bg-[#545210]/25 rounded-full overflow-hidden">
        <div 
          className="h-full bg-market-green transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Desktop view: minimalist step indicators */}
      <div className="hidden md:flex justify-between px-1">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className="flex flex-col items-center"
          >
            <div 
              className={`w-2 h-2 rounded-full mb-3 transition-all ${
                step.id < currentStep 
                  ? "bg-market-green" 
                  : step.id === currentStep 
                    ? "bg-market-green ring-4 ring-market-green/20" 
                    : "bg-[#545210]/25"
              }`}
            />
            {step.id === currentStep && (
              <span className="text-xs font-medium text-market-green absolute mt-6">
                {step.name}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Mobile view: current step indicator */}
      <div className="md:hidden flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-xs font-medium text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
        </div>
        <div className="text-sm font-medium text-market-green">
          {steps[currentStep - 1]?.name}
        </div>
      </div>
    </div>
  );
};

export default ApplicationProgress;
