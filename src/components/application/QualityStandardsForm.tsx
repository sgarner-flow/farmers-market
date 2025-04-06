
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";

interface QualityStandardsFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
}

const QualityStandardsForm = ({ form, onNext, onPrevious, className }: QualityStandardsFormProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Quality & Standards</h3>
      
      <FormField
        control={form.control}
        name="qualityControl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How do you maintain quality control for your products? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="safetyProcedures"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What food safety or handling procedures do you follow? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="priorMarkets"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Have you participated in other farmers markets before? If so, which ones?</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="uniqueValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What makes your products unique compared to others in the market? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
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
          Continue to Community
        </Button>
      </div>
    </div>
  );
};

export default QualityStandardsForm;
