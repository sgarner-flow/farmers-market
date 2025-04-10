'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronDown, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function ChatbotSidebar() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your financial analyst assistant. I can analyze vendor sales data, identify trends, compare vendor performance, and provide market insights. What would you like to know about your sales data?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expandedHeight, setExpandedHeight] = useState<string>('auto');
  
  // Determine message area height based on number of messages
  useEffect(() => {
    // Calculate ideal height based on number of messages (approximate)
    const baseHeight = 150; // Base height for input area and header
    const messageHeight = 100; // Approximate height per message
    const maxHeight = window.innerHeight - 50; // Maximum height (viewport height minus some padding)
    
    // Calculate height but cap it at max height
    const calculatedHeight = Math.min(baseHeight + messages.length * messageHeight, maxHeight);
    setExpandedHeight(`${calculatedHeight}px`);
    
    // Auto-scroll to bottom after height change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Auto-scroll to the bottom of the messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Prevent page scroll when input gets focus
  const handleInputFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Prevent any default behavior that might cause page scrolling
    e.preventDefault();
    // Don't let the focus event bubble up to parent elements
    e.stopPropagation();
  };

  // Focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Function to handle sending a message to the chatbot
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Get the sales data from our API endpoint
      const salesCsvResponse = await fetch('/api/getSalesData');
      
      if (!salesCsvResponse.ok) {
        throw new Error('Failed to fetch sales data');
      }
      
      const salesCsvData = await salesCsvResponse.text();
      
      // Construct the full prompt with the CSV data
      const fullPrompt = `@sales.csv\n${salesCsvData}\n\n${userMessage.content}`;
      
      // Call OpenAI API through our own API endpoint for security
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          systemPrompt: `You are an expert financial analyst for farmers' market vendors. Analyze sales performance, trends, and patterns across vendors and time periods. Focus on:
1. Sales patterns and trends
2. Vendor performance comparisons
3. Market insights and seasonal variations
4. Data interpretation and metrics

When asked about weather or events affecting performance around specific dates:
- For January-February 2025: There were unusually warm days (75-80°F) which drove higher foot traffic, especially on weekends.
- For March 2-9, 2025: A local food festival nearby increased visitor numbers by approximately 30%.
- For March 16, 2025: Light rain in the morning reduced early attendance, but clear afternoon weather helped recovery.
- For March 23, 2025: Perfect weather (72°F, sunny) resulted in the highest attendance of the month.
- For March 30, 2025: A competing market event in Brickell drew away some regular customers.

When questions mention weather or events, actively incorporate this contextual information in your analysis of how these factors likely affected sales performance on those dates. Look for correlations between the provided weather/event data and sales patterns in the CSV data.

Be specific about figures, highlight significant changes, and provide context. Only use information from the provided context, but make full use of ALL information provided.

When interpreting date ranges, or asked about historical data, use the provided current date to determine which events fall within the specified range.`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }
      
      const data = await response.json();
      const aiResponse = data.response || 'Sorry, I could not generate a response.';
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error communicating with OpenAI:', error);
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again later.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid form submission
      handleSendMessage();
    }
  };

  // Clear all messages
  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'I\'m ready to help analyze your sales data. What insights would you like to explore today?',
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer bg-[#F3EDDF] text-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="bg-[#E6D5BC] p-1.5 rounded-lg">
            <Sparkles size={16} className="text-gray-800" />
          </div>
          <h2 className="text-lg font-medium">Financial Assistant</h2>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-gray-800 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
        />
      </div>
      
      {/* Messages Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col relative"
            style={{ maxHeight: 'calc(100vh - 150px)' }}
          >
            <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-230px)]">
              <div className="space-y-4 pb-2">
                {messages.map((message, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-[#F3EDDF] text-gray-800 border border-[#E6D5BC]'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-1.5 ${
                        message.role === 'user' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Footer with Input */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
              {/* Actions */}
              <div className="px-2 flex justify-end">
                <button 
                  onClick={handleClearChat} 
                  className="text-xs text-gray-500 flex items-center gap-1 px-2 py-1 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <XCircle size={12} />
                  Clear Chat
                </button>
              </div>

              {/* Input Area */}
              <div className="px-4 py-2">
                <div className="flex gap-2 items-end">
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      placeholder="Ask about vendor financial data..."
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        // Auto-resize the textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                      }}
                      onFocus={handleInputFocus}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      rows={1}
                      className="pl-4 pr-10 py-3 rounded-2xl border-gray-200 focus:border-[#F3EDDF] focus:ring focus:ring-[#F3EDDF]/20 transition-all shadow-sm w-full resize-none overflow-hidden text-sm"
                      style={{ 
                        minHeight: '44px', 
                        maxHeight: '150px',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word'
                      }}
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-4">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#E6D5BC] rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="rounded-full h-10 w-10 bg-[#F3EDDF] hover:bg-[#E6D5BC] transition-all shadow-sm text-gray-800 self-end mb-1"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 italic">
                    Powered by advanced financial analysis AI
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 