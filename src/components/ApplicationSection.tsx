'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createClient } from '@/lib/supabase';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialFormSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  product_type: z.enum(['Produce', 'Baked Goods', 'Beverages', 'Crafts', 'Other']),
  locally_sourced: z.enum(['Yes', 'Partially', 'No']),
  organic_pesticide_free: z.enum(['Yes', 'Some', 'No']),
  eco_friendly_packaging: z.enum(['Yes', 'Working on it', 'No']),
  email: z.string().email('Please enter a valid email address'),
  vendor_website: z.string().optional(),
  location: z.enum(['Miami', 'FLL', 'Brickell', 'Aventura', 'El Portal', 'Granada'])
});

type FormValues = z.infer<typeof initialFormSchema>;

const ApplicationSection = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(initialFormSchema),
    defaultValues: {
      business_name: "",
      email: "",
      vendor_website: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // First create the application
      const { data: application, error } = await supabase
        .from('vendor_applications')
        .insert([
          {
            email: data.email,
            business_name: data.business_name,
            product_type: data.product_type,
            locally_sourced: data.locally_sourced,
            organic_pesticide_free: data.organic_pesticide_free,
            eco_friendly_packaging: data.eco_friendly_packaging,
            vendor_website: data.vendor_website || '',
            status: 'pending',
            payment_status: 'pending',
            location: data.location,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Successfully added to database
      toast.success("Application submitted successfully!");

      try {
        // Prepare the base URL - default to relative path if not specified
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? 
          process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : ''; // Remove trailing slash if present
        
        // Then trigger the AI review - use relative path if no base URL
        const reviewResponse = await fetch(`${baseUrl}/api/reviewVendor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationId: application.id
          }),
        });

        if (!reviewResponse.ok) {
          console.warn('AI review request was not successful:', reviewResponse.status, reviewResponse.statusText);
          // Continue execution - this is not critical for the user
        } else {
          console.log('AI review request successful');
        }
      } catch (reviewError) {
        // Log the error but don't fail the submission
        console.error('Error triggering AI review:', reviewError);
        // Not showing this error to the user as it's a background process
      }

      // Redirect user regardless of AI review success
      router.push("/");
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("There was an error submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="apply" className="py-16 bg-[#F3EDDF]">
      <div className="site-container">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium text-market-brown mb-4 uppercase">
            APPLY TO BECOME A VENDOR
          </h2>
          <div className="w-20 h-1 bg-market-orange mx-auto mb-8"></div>
          <p className="text-lg text-market-olive">
            Interested in joining our community of vendors? Fill out the application below to get started.
          </p>
        </div>

        <Card className="max-w-3xl mx-auto border-market-green/20">
          <CardHeader>
            <CardTitle className="text-market-olive">Vendor Application</CardTitle>
            <CardDescription>
              Please provide your details to apply for a vendor spot at our market
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="product_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Produce">Produce</SelectItem>
                          <SelectItem value="Baked Goods">Baked Goods</SelectItem>
                          <SelectItem value="Beverages">Beverages</SelectItem>
                          <SelectItem value="Crafts">Crafts</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locally_sourced"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Are your ingredients locally sourced?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Yes" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Partially" />
                            </FormControl>
                            <FormLabel className="font-normal">Partially</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="No" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="organic_pesticide_free"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you use organic or pesticide-free ingredients?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Yes" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Some" />
                            </FormControl>
                            <FormLabel className="font-normal">Some</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="No" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eco_friendly_packaging"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Does your business use eco-friendly packaging? <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Yes" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Yes
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Working on it" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Working on it
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="No" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              No
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Market Location <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Miami">Miami</SelectItem>
                          <SelectItem value="FLL">FLL</SelectItem>
                          <SelectItem value="Brickell">Brickell</SelectItem>
                          <SelectItem value="Aventura">Aventura</SelectItem>
                          <SelectItem value="El Portal">El Portal</SelectItem>
                          <SelectItem value="Granada">Granada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vendor_website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-market-green hover:bg-market-olive text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ApplicationSection;
