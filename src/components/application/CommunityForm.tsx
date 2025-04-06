
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";

interface CommunityFormProps {
  form: UseFormReturn<any>;
  onNext: () => void;
  onPrevious: () => void;
}

const CommunityForm = ({ form, onNext, onPrevious }: CommunityFormProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Community & Engagement</h3>
      
      <FormField
        control={form.control}
        name="joinReason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Why do you want to join Flow Farmers Market? <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="communityEngagement"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How do you engage with the local community through your business?</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="openToCollaboration"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Would you be open to collaborations with other vendors at the market?</FormLabel>
            <FormDescription>
              If yes, do you have any ideas for potential collaborations?
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
        name="customerEducation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How do you educate your customers about your products?</FormLabel>
            <FormDescription>
              e.g., sustainability, sourcing, preparation methods
            </FormDescription>
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
          Continue to Operations
        </Button>
      </div>
    </div>
  );
};

export default CommunityForm;
