
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";

interface OperationalFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
}

const OperationalForm = ({ form, onNext, onPrevious }: OperationalFormProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Operational & Commitment</h3>
      
      <FormField
        control={form.control}
        name="commitmentLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you able to commit to participating regularly in the market? <span className="text-red-500">*</span></FormLabel>
            <FormDescription>
              If not, what schedule works best for you?
            </FormDescription>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="specialRequirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Do you require electricity or any special setup accommodations for your stall?</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="customerService"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How do you handle customer service and complaints? <span className="text-red-500">*</span></FormLabel>
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
          Review Application
        </Button>
      </div>
    </div>
  );
};

export default OperationalForm;
