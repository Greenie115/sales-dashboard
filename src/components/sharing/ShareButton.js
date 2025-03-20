// ShareButton.js
import React, { useEffect, useState } from 'react';
import { useSharing } from '../../context/SharingContext';
import { Button, Icon } from '../ui';
import supabase from '../../utils/supabase';

/**
 * ShareButton component - A button that opens the sharing modal
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Button variant (primary, secondary, outline, ghost)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.icon - Whether to show an icon
 * @param {string} props.label - Button label
 */
const ShareButton = ({ 
  className = "", 
  variant = "primary", 
  size = "md", 
  icon = true, 
  label = "Share",
  ...props
}) => {
  const { openSharingModal } = useSharing();
  const [hasCheckedSupabase, setHasCheckedSupabase] = useState(false);
  
  // On mount, perform a quick Supabase connection test
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      if (hasCheckedSupabase) return;
      
      try {
        // Check if we can connect to Supabase or already have detected SSL issues
        if (supabase.hasSslError()) {
          console.warn("SSL errors already detected with Supabase");
          return;
        }
        
        // Try a simple connection test (handled by the client)
        const { data, error } = await supabase.from('shared_dashboards')
          .select('count', { count: 'exact', head: true });
          
        if (error) {
          // Check if this is an SSL error
          if (error.message && (
            error.message.includes('SSL') || 
            error.message.includes('certificate') || 
            error.message.includes('CERT_') || 
            error.message.includes('ERR_CERT'))) {
            
            console.error("SSL certificate error detected during connection test:", error.message);
            
            // Force SSL error flag in supabase client
            if (typeof supabase.forceSSLError === 'function') {
              supabase.forceSSLError();
            }
          }
        }
      } catch (err) {
        console.error("Error checking Supabase connection:", err);
      } finally {
        setHasCheckedSupabase(true);
      }
    };
    
    checkSupabaseConnection();
  }, [hasCheckedSupabase]);
  
  return (
    <Button
      type="button"
      onClick={openSharingModal}
      variant={variant}
      size={size}
      className={className}
      icon={icon ? <Icon name="share" /> : undefined}
      {...props}
    >
      {label}
    </Button>
  );
};

export default ShareButton;