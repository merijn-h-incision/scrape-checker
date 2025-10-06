'use client';

import { useState } from 'react';
import { Check, X, XCircle, ExternalLink, FileText, Tag } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getImageUrls, getManualUrls, formatDeviceTitle, getStatusColor, getStatusLabel } from '@/utils/csvParser';
import { MATERIAL_CATEGORIES, getSubcategoriesForCategory, hasSubcategories } from '@/utils/categories';
import { ImageWithFallback } from './ImageWithFallback';
import { ImageThumbnail } from './ImageThumbnail';
import type { DeviceData } from '@/types/device';

interface DeviceRowProps {
  device: DeviceData;
  deviceIndex: number;
  rowNumber: number;
}

export function DeviceRow({ device, deviceIndex, rowNumber }: DeviceRowProps) {
  const { updateDevice } = useAppStore();
  const [selectedImageUrl, setSelectedImageUrl] = useState(device.selected_image_url || device.image_url);
  const [selectedManualUrl, setSelectedManualUrl] = useState(device.selected_manual_url || device.manual_url);
  const [notes, setNotes] = useState(device.checker_notes || '');
  const [materialCategory, setMaterialCategory] = useState(device.material_category || '');
  const [materialSubcategory, setMaterialSubcategory] = useState(device.material_subcategory || '');
  
  const imageUrls = getImageUrls(device);
  const manualUrls = getManualUrls(device);
  const deviceTitle = formatDeviceTitle(device);

  const handleImageSelect = (url: string) => {
    setSelectedImageUrl(url);
    // Automatically approve when an image is selected (unless already rejected)
    const newStatus = device.status === 'rejected' ? 'rejected' : 'approved';
    updateDevice(deviceIndex, { 
      selected_image_url: url,
      status: newStatus
    });
  };

  const handleManualSelect = (url: string) => {
    setSelectedManualUrl(url);
    updateDevice(deviceIndex, { 
      selected_manual_url: url
    });
  };

  const handleStatusChange = (status: DeviceData['status']) => {
    // When rejecting a device, clear the selected image URL
    if (status === 'rejected') {
      setSelectedImageUrl('');
      updateDevice(deviceIndex, { 
        status,
        selected_image_url: ''
      });
    } else {
      updateDevice(deviceIndex, { status });
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    updateDevice(deviceIndex, { checker_notes: newNotes });
  };

  const handleCategoryChange = (category: string) => {
    setMaterialCategory(category);
    // Reset subcategory if switching to a category that doesn't have subcategories
    if (!hasSubcategories(category)) {
      setMaterialSubcategory('');
      updateDevice(deviceIndex, { material_category: category, material_subcategory: '' });
    } else {
      updateDevice(deviceIndex, { material_category: category });
    }
  };

  const handleSubcategoryChange = (subcategory: string) => {
    setMaterialSubcategory(subcategory);
    updateDevice(deviceIndex, { material_subcategory: subcategory });
  };

  const statusColor = getStatusColor(device.status);
  const statusLabel = getStatusLabel(device.status);

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Device Header */}
      <div className="bg-muted/30 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-muted-foreground">
                Row {rowNumber}/10
              </span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mt-1">
              {device.product_name}
            </h3>
            
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span>
                <strong>Manufacturer:</strong> {device.manufacturer}
              </span>
              <span>
                <strong>Model:</strong> {device.manuf_number}
              </span>
              {device.gmdn_terms && (
                <span>
                  <strong>Type:</strong> {device.gmdn_terms}
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStatusChange('approved')}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${device.status === 'approved' 
                  ? 'bg-success text-white' 
                  : 'border border-border hover:bg-success/10 hover:border-success'
                }
              `}
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>
            
            <button
              onClick={() => handleStatusChange('skipped')}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${device.status === 'skipped' 
                  ? 'bg-muted text-muted-foreground' 
                  : 'border border-border hover:bg-muted/50'
                }
              `}
            >
              <X className="w-4 h-4" />
              <span>Skip</span>
            </button>
            
            <button
              onClick={() => handleStatusChange('rejected')}
              className={`
                flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${device.status === 'rejected' 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'border border-border hover:bg-destructive/10 hover:border-destructive'
                }
              `}
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Selection Area */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Image Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Selected Image</h4>
              {selectedImageUrl && (
                <a
                  href={selectedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Full Size</span>
                </a>
              )}
            </div>
            
            <div className="relative">
              <ImageWithFallback
                src={selectedImageUrl}
                alt={deviceTitle}
                className="w-full h-64 object-cover rounded-lg border border-border bg-muted"
              />
              
              {selectedImageUrl === device.image_url && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                  Primary
                </div>
              )}
            </div>
          </div>

          {/* Alternative Images Grid */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">
              Alternative Images ({imageUrls.length})
            </h4>
            
            {imageUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {imageUrls.map((url, index) => (
                  <ImageThumbnail
                    key={index}
                    src={url}
                    alt={`${deviceTitle} - Image ${index + 1}`}
                    isSelected={url === selectedImageUrl}
                    isPrimary={url === device.image_url}
                    onClick={() => handleImageSelect(url)}
                    className="h-20 w-full"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No alternative images available</p>
              </div>
            )}
          </div>
        </div>

        {/* Manual Selection */}
        {manualUrls.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Selected Manual Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Selected Manual</h4>
                  {selectedManualUrl && (
                    <a
                      href={selectedManualUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Manual</span>
                    </a>
                  )}
                </div>
                
                <div className="relative">
                  <div className="w-full h-32 bg-muted border border-border rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedManualUrl ? 'Manual Selected' : 'No manual selected'}
                      </p>
                      {selectedManualUrl && (
                        <p className="text-xs text-muted-foreground truncate max-w-48">
                          {selectedManualUrl.split('/').pop()?.split('?')[0] || 'Manual'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedManualUrl === device.manual_url && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                      Primary
                    </div>
                  )}
                </div>
              </div>

              {/* Alternative Manuals List */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">
                  Available Manuals ({manualUrls.length})
                </h4>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {manualUrls.map((url, index) => {
                    const isSelected = url === selectedManualUrl;
                    const isPrimary = url === device.manual_url;
                    const filename = url.split('/').pop()?.split('?')[0] || `Manual ${index + 1}`;
                    
                    return (
                      <div
                        key={index}
                        className={`
                          flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer
                          ${isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 hover:bg-accent'
                          }
                        `}
                        onClick={() => handleManualSelect(url)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {filename}
                            </span>
                            {isPrimary && (
                              <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Manual {index + 1}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isSelected && (
                            <Check className="w-4 h-4 text-success" />
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <label htmlFor={`notes-${deviceIndex}`} className="block text-sm font-medium text-foreground mb-2">
            Checker Notes (Optional)
          </label>
          <textarea
            id={`notes-${deviceIndex}`}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add any notes about this device or image selection..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            rows={2}
          />
        </div>

        {/* Material Category Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Material Classification (Optional)</h4>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div>
              <label htmlFor={`category-${deviceIndex}`} className="block text-sm font-medium text-foreground mb-2">
                Material Category
              </label>
              <select
                id={`category-${deviceIndex}`}
                value={materialCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Select category...</option>
                {MATERIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Dropdown */}
            <div>
              <label htmlFor={`subcategory-${deviceIndex}`} className="block text-sm font-medium text-foreground mb-2">
                Material Subcategory
              </label>
              <select
                id={`subcategory-${deviceIndex}`}
                value={materialSubcategory}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                disabled={!materialCategory || !hasSubcategories(materialCategory)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                <option value="">
                  {!materialCategory 
                    ? "Select category first..." 
                    : !hasSubcategories(materialCategory) 
                    ? "No subcategories available" 
                    : "Select subcategory..."
                  }
                </option>
                {materialCategory && hasSubcategories(materialCategory) && 
                  getSubcategoriesForCategory(materialCategory).map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Category Info */}
          {materialCategory && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Selected:</strong> {materialCategory}
                {materialSubcategory && ` → ${materialSubcategory}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 