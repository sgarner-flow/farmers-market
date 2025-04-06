import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";

interface ReviewFormProps {
  form: UseFormReturn<any>;
  onSubmit: () => void;
  onPrevious: () => void;
  step1Data: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
  };
}

const ReviewForm = ({ form, onSubmit, onPrevious, step1Data }: ReviewFormProps) => {
  const formValues = form.getValues();
  
  // Define sections for review
  const sections = [
    {
      title: "Basic Information",
      fields: [
        { label: "Business Name", value: step1Data.businessName },
        { label: "Contact Name", value: step1Data.contactName },
        { label: "Email", value: step1Data.email },
        { label: "Phone", value: step1Data.phone },
        { label: "Preferred Location", value: formValues.location }
      ]
    },
    {
      title: "Business Information",
      fields: [
        { label: "Products", value: formValues.productType },
        { label: "Time in Business", value: formValues.businessLength },
        { label: "Sourcing", value: formValues.sourcingInfo }
      ]
    },
    {
      title: "Sustainability & Ethics",
      fields: [
        { label: "Sustainability Practices", value: formValues.sustainabilityPractices },
        { label: "Eco-friendly Packaging", value: formValues.ecoFriendlyPackaging },
        { label: "Local Sourcing", value: formValues.locallySourced },
        { label: "Organic Priority", value: formValues.organicPriority },
        { label: "Certifications", value: formValues.certifications }
      ]
    },
    {
      title: "Quality & Standards",
      fields: [
        { label: "Quality Control", value: formValues.qualityControl },
        { label: "Safety Procedures", value: formValues.safetyProcedures },
        { label: "Prior Markets", value: formValues.priorMarkets },
        { label: "Unique Value", value: formValues.uniqueValue }
      ]
    },
    {
      title: "Community & Engagement",
      fields: [
        { label: "Reason for Joining", value: formValues.joinReason },
        { label: "Community Engagement", value: formValues.communityEngagement },
        { label: "Collaboration", value: formValues.openToCollaboration },
        { label: "Customer Education", value: formValues.customerEducation }
      ]
    },
    {
      title: "Operational & Commitment",
      fields: [
        { label: "Market Commitment", value: formValues.commitmentLevel },
        { label: "Special Requirements", value: formValues.specialRequirements },
        { label: "Customer Service", value: formValues.customerService }
      ]
    }
  ];
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-market-brown">Review Your Application</h3>
      <p className="text-muted-foreground">Please review all your information before submitting.</p>
      
      {sections.map((section, idx) => (
        <Card key={idx} className="border-market-green/20">
          <CardContent className="pt-4">
            <h4 className="font-medium text-market-olive mb-2">{section.title}</h4>
            <div className="space-y-2">
              {section.fields.map((field, fieldIdx) => (
                field.value ? (
                  <div key={fieldIdx} className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium text-gray-600">{field.label}:</div>
                    <div className="col-span-2">{field.value}</div>
                  </div>
                ) : null
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      <FormField
        control={form.control}
        name="agreement"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                I agree to the <a href="#" className="text-market-green hover:underline">vendor terms and conditions</a> <span className="text-red-500">*</span>
              </FormLabel>
              <FormMessage />
            </div>
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
          onClick={onSubmit}
          disabled={!form.getValues().agreement}
          className="bg-market-green hover:bg-market-olive text-white"
        >
          Submit Application
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        <span className="text-red-500">*</span> Required fields
      </p>
    </div>
  );
};

export default ReviewForm;
