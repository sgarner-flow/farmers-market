
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface SustainabilityFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
}

const SustainabilityForm = ({ form, onNext, onPrevious }: SustainabilityFormProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Sustainability & Ethics</h3>
      
      <FormField
        control={form.control}
        name="sustainabilityPractices"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How do you ensure that your products are sustainably produced? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="ecoFriendlyPackaging"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Do you use eco-friendly packaging? If so, please describe your packaging choices.</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="locallySourced"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are your ingredients locally sourced? If yes, what percentage of your ingredients are sourced locally?</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="organicPriority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Do you prioritize organic, pesticide-free, or non-GMO ingredients? Please elaborate.</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="certifications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Do you have any certifications related to sustainability or ethical sourcing?</FormLabel>
            <FormDescription>
              e.g., USDA Organic, Fair Trade, Rainforest Alliance, etc.
            </FormDescription>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
        >
          Back
        </Button>
        <Button 
          onClick={onNext}
          className="bg-market-green hover:bg-market-olive text-white"
        >
          Continue to Quality Standards
        </Button>
      </div>
    </div>
  );
};

export default SustainabilityForm;
