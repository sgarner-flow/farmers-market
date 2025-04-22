'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type VendorApplication = Database['public']['Tables']['vendor_applications']['Row'];

export default function VendorInvites() {
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState({ name: '', email: '', website: '' });
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorApplication | null>(null);
  const [emailQuestions, setEmailQuestions] = useState({
    pricing: false,
    products: false,
    schedule: false,
    sourcing: false,
    setup: false,
    availability: false
  });
  const [generatedEmail, setGeneratedEmail] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    fetchReviewedVendors();
  }, []);

  const fetchReviewedVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_applications')
        .select('*')
        .eq('status', 'Reviewed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      setError('Failed to fetch vendors');
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = async () => {
    // Validate inputs
    if (!newVendor.name.trim() || !newVendor.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      // Check for duplicates first
      const { data: existingVendors, error: checkError } = await supabase
        .from('vendor_applications')
        .select('id, business_name, email')
        .or(`business_name.ilike.${newVendor.name},email.ilike.${newVendor.email}`);

      if (checkError) throw checkError;

      if (existingVendors && existingVendors.length > 0) {
        const duplicateType = existingVendors.find(v => v.business_name.toLowerCase() === newVendor.name.toLowerCase())
          ? 'name'
          : 'email';
        toast.error(`A vendor with this ${duplicateType} already exists`);
        return;
      }

      const { data, error } = await supabase
        .from('vendor_applications')
        .insert({
          business_name: newVendor.name,
          email: newVendor.email,
          vendor_website: newVendor.website,
          status: 'Reviewed',
          // These fields are required by the schema, so provide default values
          product_type: 'Other',
          locally_sourced: 'No',
          organic_pesticide_free: 'No',
          eco_friendly_packaging: 'No',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setVendors(prev => [data, ...prev]);
      setNewVendor({ name: '', email: '', website: '' });
      toast.success('Vendor added successfully');
    } catch (err: unknown) {
      console.error('Error adding vendor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add vendor';
      toast.error(errorMessage);
    }
  };

  const handleBulkAddVendors = async () => {
    if (!bulkInput.trim()) {
      toast.error('Please enter vendor data');
      return;
    }

    setIsBulkAdding(true);
    
    try {
      // Parse the bulk input (tab-separated)
      const lines = bulkInput.trim().split('\n');
      const vendorsToProcess = [];
      const errors = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split('\t');
        
        if (parts.length < 2) {
          errors.push(`Invalid format in line: ${line}`);
          continue;
        }
        
        const name = parts[0]?.trim();
        const email = parts[1]?.trim();
        let website = parts[2]?.trim();
        
        // Handle the @website format
        if (website?.startsWith('@')) {
          website = website.substring(1);
        }
        
        if (!name || !email || !email.includes('@')) {
          errors.push(`Invalid format in line: ${line}`);
          continue;
        }
        
        vendorsToProcess.push({
          business_name: name,
          email: email,
          vendor_website: website || null,
          status: 'Reviewed',
          product_type: 'Other',
          locally_sourced: 'No',
          organic_pesticide_free: 'No',
          eco_friendly_packaging: 'No',
          payment_status: 'pending'
        });
      }
      
      if (vendorsToProcess.length === 0) {
        toast.error('No valid vendors found in input');
        setIsBulkAdding(false);
        return;
      }

      // Check for duplicates individually
      const results: VendorApplication[] = [];
      const duplicates: string[] = [];

      for (const vendor of vendorsToProcess) {
        // Check if this vendor exists
        const { data: existingVendors } = await supabase
          .from('vendor_applications')
          .select('business_name, email')
          .or(`business_name.ilike.${vendor.business_name},email.ilike.${vendor.email}`);

        if (existingVendors && existingVendors.length > 0) {
          duplicates.push(vendor.business_name);
          continue;
        }

        // Insert non-duplicate vendor
        const { data, error } = await supabase
          .from('vendor_applications')
          .insert([vendor])
          .select();

        if (error) {
          errors.push(`Error adding ${vendor.business_name}: ${error.message}`);
        } else if (data) {
          results.push(...data);
        }
      }
      
      // Update UI and show results
      if (results.length > 0) {
        setVendors(prev => [...results, ...prev]);
        setBulkInput('');
      }

      // Show summary of what happened
      const messages = [];
      if (results.length > 0) {
        messages.push(`Successfully added ${results.length} vendors`);
      }
      if (duplicates.length > 0) {
        messages.push(`Skipped ${duplicates.length} duplicate vendors: ${duplicates.join(', ')}`);
      }
      if (errors.length > 0) {
        messages.push(`${errors.length} errors occurred`);
      }

      toast.success(messages.join('. '));
      
    } catch (err: unknown) {
      console.error('Error processing bulk vendors:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add vendors';
      toast.error(errorMessage);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const generateEmailText = (vendor: VendorApplication) => {
    const questions = [];
    if (emailQuestions.pricing) questions.push("Can you provide pricing information for your products?");
    if (emailQuestions.products) questions.push("What specific products are you planning to sell?");
    if (emailQuestions.schedule) questions.push("What market dates are you interested in attending?");
    if (emailQuestions.sourcing) questions.push("Can you confirm how your products are sourced?");
    if (emailQuestions.setup) questions.push("What are your space/setup requirements?");
    if (emailQuestions.availability) questions.push("Can you also please confirm that you are available to join most Saturdays?");

    const emailText = `Hi ${vendor.business_name},

We are kicking off the FLL Farmer's Market! We really like what we've seen about you online and think you could be a good match.
${questions.length > 0 ? `
We have a few questions for you to begin the process:

${questions.map(q => `- ${q}`).join('\n')}
` : ''}
You can learn more about the market here: https://flowfarmersmarket.vercel.app/

Looking forward to your response,
Flow Farmers Market Team`;

    return emailText;
  };

  // Update email text whenever checkboxes change
  useEffect(() => {
    if (selectedVendor) {
      setGeneratedEmail(generateEmailText(selectedVendor));
    }
  }, [emailQuestions, selectedVendor]);

  const handleGenerateEmail = (vendor: VendorApplication) => {
    setSelectedVendor(vendor);
    setGeneratedEmail(generateEmailText(vendor));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Email text copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleMarkAsContacted = async (vendor: VendorApplication) => {
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .update({ status: 'contacted' })
        .eq('id', vendor.id);

      if (error) throw error;

      // Remove vendor from the list
      setVendors(vendors.filter(v => v.id !== vendor.id));
      setSelectedVendor(null);
      setGeneratedEmail('');
      toast.success(`${vendor.business_name} marked as contacted`);
    } catch (err) {
      console.error('Error updating vendor status:', err);
      toast.error('Failed to update vendor status');
    }
  };

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-[90rem]">
      <h1 className="text-2xl font-bold mb-6">Vendor Invitations</h1>
      
      {/* Add Vendor Tabs */}
      <Tabs defaultValue="single" className="mb-8">
        <TabsList>
          <TabsTrigger value="single">Add Single Vendor</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Add Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Add New Vendor</CardTitle>
              <CardDescription>Add a new vendor to the invitation list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="Vendor Name"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Website (optional)"
                    value={newVendor.website}
                    onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={handleAddVendor}>Add Vendor</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Add Vendors</CardTitle>
              <CardDescription>
                Add multiple vendors at once. Paste a list with each line in the format:<br />
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">Vendor Name[tab]Email[tab]@Website</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="min-h-[150px] font-mono"
              />
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline"
                onClick={handleBulkAddVendors} 
                disabled={isBulkAdding}
              >
                {isBulkAdding ? 'Adding Vendors...' : 'Add Vendors'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Vendors and Email Generation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendors List */}
        <Card className="lg:min-h-[600px]">
          <CardHeader>
            <CardTitle>Vendors to Invite</CardTitle>
            <CardDescription>Vendors with &ldquo;Reviewed&rdquo; status ready for invitation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center p-4">Loading vendors...</div>
            ) : vendors.length === 0 ? (
              <div className="text-center p-4 text-gray-500">No vendors with &ldquo;Reviewed&rdquo; status found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.business_name}</TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateEmail(vendor)}
                        >
                          Generate Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Email Generation Card */}
        <Card className="lg:min-h-[600px]">
          <CardHeader>
            <CardTitle>Email Generator</CardTitle>
            <CardDescription>
              {selectedVendor ? 
                `Generating email for: ${selectedVendor.business_name}` : 
                'Select a vendor to generate an email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Select Questions to Include:</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pricing" 
                      checked={emailQuestions.pricing}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, pricing: checked === true}))
                      }
                    />
                    <label htmlFor="pricing" className="text-sm">Pricing information</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="products" 
                      checked={emailQuestions.products}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, products: checked === true}))
                      }
                    />
                    <label htmlFor="products" className="text-sm">Product details</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="schedule" 
                      checked={emailQuestions.schedule}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, schedule: checked === true}))
                      }
                    />
                    <label htmlFor="schedule" className="text-sm">Market dates</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sourcing" 
                      checked={emailQuestions.sourcing}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, sourcing: checked === true}))
                      }
                    />
                    <label htmlFor="sourcing" className="text-sm">Sourcing confirmation</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="setup" 
                      checked={emailQuestions.setup}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, setup: checked === true}))
                      }
                    />
                    <label htmlFor="setup" className="text-sm">Space requirements</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="availability" 
                      checked={emailQuestions.availability}
                      onCheckedChange={(checked) => 
                        setEmailQuestions(prev => ({...prev, availability: checked === true}))
                      }
                    />
                    <label htmlFor="availability" className="text-sm">Saturday availability</label>
                  </div>
                </div>
              </div>

              {selectedVendor && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Generated Email:</h3>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(generatedEmail)}
                      >
                        Copy to Clipboard
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 min-h-[200px] whitespace-pre-wrap text-sm bg-white">
                      {generatedEmail}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      onClick={() => handleMarkAsContacted(selectedVendor)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      ✓ Mark as Contacted
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 