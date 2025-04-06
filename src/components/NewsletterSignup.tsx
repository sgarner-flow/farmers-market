'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('mailing_list')
        .insert([
          {
            email,
            name,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      setStatus('success');
      setMessage('Thank you for subscribing to our newsletter!');
      setEmail('');
      setName('');
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="bg-market-cream p-8 rounded-lg shadow-md max-w-md mx-auto border border-market-olive/10">
      <h3 className="text-xl font-medium text-market-olive mb-4">
        Get Market Updates
      </h3>
      <p className="text-market-olive/80 mb-6 text-sm">
        Subscribe to receive weekly updates about vendors, special events, and seasonal produce at Flow Farmers Market.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-market-olive">
            Name
          </Label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white border-market-olive/20 focus:border-market-olive focus:ring-market-olive"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-market-olive">
            Email
          </Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-market-olive/20 focus:border-market-olive focus:ring-market-olive"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-market-green hover:bg-market-olive text-white"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </Button>

        {message && (
          <p className={`text-sm ${status === 'success' ? 'text-market-green' : 'text-destructive'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
} 