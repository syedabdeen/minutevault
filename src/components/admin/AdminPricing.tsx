import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { DollarSign, Tag, Calendar, Save } from "lucide-react";

interface PricingSettings {
  id: string;
  lifetime_price: number;
  offer_enabled: boolean;
  offer_price: number | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
  offer_description: string | null;
}

export function AdminPricing() {
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    lifetime_price: "10",
    offer_enabled: false,
    offer_price: "",
    offer_start_date: "",
    offer_end_date: "",
    offer_description: "",
  });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPricing(data);
        setFormData({
          lifetime_price: data.lifetime_price.toString(),
          offer_enabled: data.offer_enabled || false,
          offer_price: data.offer_price?.toString() || "",
          offer_start_date: data.offer_start_date
            ? format(new Date(data.offer_start_date), "yyyy-MM-dd")
            : "",
          offer_end_date: data.offer_end_date
            ? format(new Date(data.offer_end_date), "yyyy-MM-dd")
            : "",
          offer_description: data.offer_description || "",
        });
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
      toast.error("Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData = {
        lifetime_price: parseFloat(formData.lifetime_price),
        offer_enabled: formData.offer_enabled,
        offer_price: formData.offer_price ? parseFloat(formData.offer_price) : null,
        offer_start_date: formData.offer_start_date || null,
        offer_end_date: formData.offer_end_date || null,
        offer_description: formData.offer_description || null,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (pricing) {
        const { error } = await supabase
          .from("pricing_settings")
          .update(updateData)
          .eq("id", pricing.id);

        if (error) throw error;
      }

      toast.success("Pricing settings updated!");
      fetchPricing();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Failed to save pricing settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="py-8 text-center">
          Loading pricing settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Base Pricing */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Base Pricing
          </CardTitle>
          <CardDescription>Set the standard lifetime access price</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lifetime_price">Lifetime Access Price ($)</Label>
              <Input
                id="lifetime_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.lifetime_price}
                onChange={(e) =>
                  setFormData({ ...formData, lifetime_price: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promotional Offers */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Promotional Offers
          </CardTitle>
          <CardDescription>Configure limited-time discounts and promotions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Offer</Label>
              <p className="text-sm text-muted-foreground">
                Show discounted price on the pricing page
              </p>
            </div>
            <Switch
              checked={formData.offer_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, offer_enabled: checked })
              }
            />
          </div>

          {formData.offer_enabled && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <Label htmlFor="offer_price">Offer Price ($)</Label>
                <Input
                  id="offer_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 7.99"
                  value={formData.offer_price}
                  onChange={(e) =>
                    setFormData({ ...formData, offer_price: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer_start_date">Start Date</Label>
                  <Input
                    id="offer_start_date"
                    type="date"
                    value={formData.offer_start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, offer_start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer_end_date">End Date</Label>
                  <Input
                    id="offer_end_date"
                    type="date"
                    value={formData.offer_end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, offer_end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer_description">Offer Badge Text</Label>
                <Textarea
                  id="offer_description"
                  placeholder="e.g., Limited Time Offer! New Year Sale!"
                  value={formData.offer_description}
                  onChange={(e) =>
                    setFormData({ ...formData, offer_description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}