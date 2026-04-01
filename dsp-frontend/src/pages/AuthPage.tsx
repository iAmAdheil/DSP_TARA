import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Fingerprint, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth mock
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4 selection:bg-accent-200 selection:text-accent-700">
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-accent-500 to-accent-300 flex items-center justify-center shadow-md shadow-accent-500/20 mb-2">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight text-text-primary">TARA Engine Workspace</h1>
          <p className="text-[14px] text-text-muted">Enterprise threat modeling & risk assessment</p>
        </div>

        {/* Auth Card */}
        <Card className="border border-border-subtle shadow-lg shadow-black/3 rounded-[12px] overflow-hidden bg-surface-0">
          <Tabs defaultValue="login" className="w-full flex flex-col">
            <div className="px-6 pt-6 pb-2">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-surface-2 rounded-[10px]">
                <TabsTrigger
                  value="login"
                  className="rounded-[8px] text-[13px] font-medium bg-transparent data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-xs text-text-secondary hover:text-text-primary hover:bg-white/60 transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-[8px] text-[13px] font-medium bg-transparent data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-xs text-text-secondary hover:text-text-primary hover:bg-white/60 transition-all"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Login Flow */}
            <TabsContent value="login" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleAuth}>
                <CardHeader className="px-6 py-4 space-y-1">
                  <CardTitle className="text-[18px] font-semibold text-text-primary">Welcome back</CardTitle>
                  <CardDescription className="text-[13px] text-text-secondary">
                    Enter your credentials to access your workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[12px] font-semibold text-text-secondary">Email address</Label>
                      <div className="relative">
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@organization.com" 
                          required 
                          className="h-[36px] pl-3 pr-10 text-[13px] border-default focus:border-focus focus:ring-[3px] focus:ring-accent-500/25 rounded-lg transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-[12px] font-semibold text-text-secondary">Password</Label>
                        <a href="#" className="text-[12px] font-medium text-accent-600 hover:text-accent-700 transition-colors">
                          Forgot password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type="password" 
                          required 
                          className="h-[36px] pl-3 pr-10 text-[13px] border-default focus:border-focus focus:ring-[3px] focus:ring-accent-500/25 rounded-lg transition-all"
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none text-text-muted">
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <Checkbox id="remember" className="h-[16px] w-[16px] shrink-0 rounded-[4px] border-border-default data-[state=checked]:bg-accent-500 data-[state=checked]:border-accent-500" />
                    <span className="text-[13px] font-medium text-text-secondary leading-none">
                      Keep me signed in for 30 days
                    </span>
                  </label>
                </CardContent>
                <div className="px-6 pb-6 mt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-[40px] bg-primary hover:bg-accent-600 hover:-translate-y-px hover:shadow-sm active:bg-accent-700 active:translate-y-0 text-white font-semibold text-[14px] rounded-[10px] shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-accent-500/20 disabled:bg-[#d1d5db] disabled:border-[#d1d5db] disabled:pointer-events-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-[16px] h-[16px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Sign into Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Register Flow */}
            <TabsContent value="register" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleAuth}>
                <CardHeader className="px-6 py-4 space-y-1">
                  <CardTitle className="text-[18px] font-semibold text-text-primary">Get Started</CardTitle>
                  <CardDescription className="text-[13px] text-text-secondary">
                    Create a new organization workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <Label htmlFor="firstName" className="text-[12px] font-semibold text-text-secondary">First Name</Label>
                         <Input id="firstName" placeholder="Admin" required className="h-[36px] text-[13px] rounded-lg" />
                      </div>
                      <div className="space-y-1.5">
                         <Label htmlFor="lastName" className="text-[12px] font-semibold text-text-secondary">Last Name</Label>
                         <Input id="lastName" placeholder="User" required className="h-[36px] text-[13px] rounded-lg" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="orgName" className="text-[12px] font-semibold text-text-secondary">Organization Name</Label>
                      <Input id="orgName" placeholder="Acme Corp Security" required className="h-[36px] text-[13px] rounded-lg" />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="regEmail" className="text-[12px] font-semibold text-text-secondary">Work Email</Label>
                      <Input id="regEmail" type="email" placeholder="name@organization.com" required className="h-[36px] text-[13px] rounded-lg" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="regPassword" className="text-[12px] font-semibold text-text-secondary">Password</Label>
                      <div className="relative">
                        <Input id="regPassword" type="password" required className="h-[36px] text-[13px] rounded-lg" />
                        <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none text-text-muted">
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted pt-1">Must be at least 12 characters and contain special symbols.</p>
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 pb-6 mt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-[40px] bg-primary hover:bg-accent-600 hover:-translate-y-px hover:shadow-sm active:bg-accent-700 active:translate-y-0 text-white font-semibold text-[14px] rounded-[10px] shadow-sm transition-all focus-visible:ring-[3px] focus-visible:ring-accent-500/20 disabled:bg-[#d1d5db] disabled:border-[#d1d5db] disabled:pointer-events-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-[16px] h-[16px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Creating Workspace...</span>
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* Social / SSO Alternative */}
          <div className="px-6 py-[16px] bg-surface-1 border-t border-border-subtle flex flex-col items-center">
            <p className="text-[12px] text-text-secondary mb-3">Or continue with SSO providers</p>
            <Button variant="outline" className="w-full h-[34px] bg-white text-text-secondary hover:bg-surface-2 border-default flex items-center justify-center space-x-2 rounded-[8px] transition-colors text-[13px] font-medium">
              <Fingerprint className="w-4 h-4" />
              <span>Sign in with Enterprise SSO</span>
            </Button>
          </div>
        </Card>

        {/* Footer info */}
        <div className="mt-8 text-center text-[12px] text-text-muted">
          <p>© 2026 TARA Application. All rights reserved.</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text-primary transition-colors">Help Center</a>
          </div>
        </div>
      </div>
    </div>
  );
}
