
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface BusinessInfoFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
}

const BusinessInfoForm = ({ form, onNext }: BusinessInfoFormProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Business Information</h3>
      
      <FormField
        control={form.control}
        name="productType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What type of products do you sell? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea 
                placeholder="e.g., produce, baked goods, beverages, artisanal crafts, etc." 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="businessLength"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How long have you been in business? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="sourcingInfo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Where do you source your ingredients/materials from? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="flex justify-end">
        <Button 
          onClick={onNext}
          className="bg-market-green hover:bg-market-olive text-white"
        >
          Continue to Sustainability
        </Button>
      </div>
    </div>
  );
};

export default BusinessInfoForm;
