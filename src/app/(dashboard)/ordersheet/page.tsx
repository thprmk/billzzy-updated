// billz/src/app/(dashboard)/ordersheet/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Phone, Package, CheckCircle, Search, AlertCircle, Send, Clock } from 'lucide-react';

// --- TYPE DEFINITIONS ---
export type OrderStatus = 'pending' | 'printing' | 'packing' | 'tracking' | 'completed';

export interface WhatsAppTemplateStatus {
  sent: boolean;
  sentAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  amount: number;
  orderDetails: string;
  serialNumber: number;
  whatsappSent: {
    orderConfirmation: WhatsAppTemplateStatus;
    packing: WhatsAppTemplateStatus;
    tracking: WhatsAppTemplateStatus;
  };
}

const OrderSheet: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string>('');

  const fetchOrders = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      console.log('🔄 Fetching orders...');
      const response = await fetch('/api/orders');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Orders fetched:', data.length);
      
      // 🔍 DEBUG: Log the complete structure of the first order
      if (data.length > 0) {
        console.log('🔍 FIRST ORDER COMPLETE STRUCTURE:', JSON.stringify(data[0], null, 2));
        console.log('🔍 FIRST ORDER WhatsApp Status:', data[0].whatsappSent);
        
        // Check each template individually
        if (data[0].whatsappSent) {
          console.log('🔍 orderConfirmation:', data[0].whatsappSent.orderConfirmation);
          console.log('🔍 packing:', data[0].whatsappSent.packing);
          console.log('🔍 tracking:', data[0].whatsappSent.tracking);
        }
      }
      
      setOrders(data);
    } catch (err: any) {
      console.error('❌ Error fetching orders:', err);
      setError(err.message || 'An unknown error occurred while fetching orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppTemplate = async (orderId: string, templateType: 'orderConfirmation' | 'packing' | 'tracking'): Promise<void> => {
    const templateKey = `${orderId}-${templateType}`;
    setSendingWhatsApp(templateKey);
    setError('');

    console.log(`🚀 BEFORE SEND - Order ${orderId}, Template: ${templateType}`);
    
    // 🔍 DEBUG: Log current order state before sending
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder) {
      console.log('🔍 CURRENT ORDER WhatsApp STATUS BEFORE SEND:', currentOrder.whatsappSent);
      console.log(`🔍 CURRENT ${templateType} STATUS:`, currentOrder.whatsappSent[templateType]);
    }

    try {
      const requestBody = {
        orderId,
        whatsappTemplate: { templateType },
      };
      
      console.log('📤 REQUEST BODY:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Error response:`, errorData);
        throw new Error(errorData.error || 'Failed to send WhatsApp template');
      }

      const updatedOrder = await response.json();
      console.log(`✅ BACKEND RESPONSE - Updated Order:`, JSON.stringify(updatedOrder, null, 2));
      console.log(`✅ BACKEND RESPONSE - WhatsApp Status:`, updatedOrder.whatsappSent);
      console.log(`✅ BACKEND RESPONSE - ${templateType} Status:`, updatedOrder.whatsappSent?.[templateType]);
      
      // Update the order in state
      setOrders(prev => {
        const newOrders = prev.map(o => 
          o.id === orderId ? {
            ...o,
            whatsappSent: updatedOrder.whatsappSent
          } : o
        );
        
        // 🔍 DEBUG: Log the updated order in state
        const updatedOrderInState = newOrders.find(o => o.id === orderId);
        console.log('🔍 UPDATED ORDER IN STATE:', updatedOrderInState?.whatsappSent);
        console.log(`🔍 UPDATED ${templateType} IN STATE:`, updatedOrderInState?.whatsappSent?.[templateType]);
        
        return newOrders;
      });

    } catch (err: any) {
      console.error(`❌ Error sending ${templateType} template:`, err);
      setError(`Failed to send ${templateType} template: ${err.message}`);
    } finally {
      setSendingWhatsApp('');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  };
  
  const filteredOrders = orders.filter(order => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTermLower) ||
                         order.customerPhone.includes(searchTerm) ||
                         (order.customerName && order.customerName.toLowerCase().includes(searchTermLower));
    return matchesSearch;
  });

  const getTemplateDisplayName = (templateType: string) => {
    switch (templateType) {
      case 'orderConfirmation': return 'Confirmation';
      case 'packing': return 'Packing';
      case 'tracking': return 'Tracking';
      default: return templateType;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header style={{ backgroundColor: '#5144e3' }} className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-white" />
            <h1 className="text-xl font-bold text-white">Order Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search orders..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button 
              onClick={fetchOrders} 
              className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-50 font-semibold"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.NO</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ORDER ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUSTOMER & PHONE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WHATSAPP TEMPLATES</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#5144e3', margin: 'auto' }}></div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">₹{order.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="flex items-center  space-x-2 text-sm text-gray-600 mt-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{order.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-3">
                        {(['orderConfirmation', 'packing', 'tracking'] as const).map(templateType => {
                          const isSending = sendingWhatsApp === `${order.id}-${templateType}`;
                          
                          const template = order.whatsappSent?.[templateType];
                          
                          // Determine if message was sent
                          const messageSent = template && template.sent === true;
                          const isDisabled = isSending || messageSent;

                          // Icon logic
                          let IconComponent;
                          let iconClassName = '';
                          let buttonClassName = 'flex items-center justify-center w-8 h-8 rounded-full transition-colors ';
                          let tooltipText = '';

                          if (isSending) {
                            IconComponent = () => (
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            );
                            buttonClassName += 'cursor-wait bg-blue-50';
                            tooltipText = `Sending ${getTemplateDisplayName(templateType)}...`;
                          } else if (messageSent) {
                            IconComponent = CheckCircle;
                            iconClassName = 'text-green-600';
                            buttonClassName += 'cursor-default bg-green-50';
                            tooltipText = `${getTemplateDisplayName(templateType)} sent${template.sentAt ? ' at ' + new Date(template.sentAt).toLocaleString() : ''}`;
                          } else {
                            IconComponent = Send;
                            iconClassName = 'text-blue-500';
                            buttonClassName += 'hover:bg-blue-50 cursor-pointer';
                            tooltipText = `Send ${getTemplateDisplayName(templateType)}`;
                          }

                          return (
                            <div key={templateType} className="flex items-center justify-between">
                              {/* --- MODIFICATION START --- */}
                              <span className={`text-xs font-medium ${messageSent ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                                {getTemplateDisplayName(templateType)}
                              </span>
                              {/* --- MODIFICATION END --- */}
                              <button 
                                onClick={() => {
                                  if (!isDisabled) {
                                    sendWhatsAppTemplate(order.id, templateType);
                                  }
                                }} 
                                disabled={isDisabled}
                                className={buttonClassName}
                                title={tooltipText}
                              >
                                <IconComponent className={`w-4 h-4 ${iconClassName}`} />
                              </button>
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-700">Showing 1 to {filteredOrders.length} of {filteredOrders.length} results</p>
          <div className="flex items-center space-x-1">
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 text-sm text-white rounded-md" style={{ backgroundColor: '#5144e3' }}>1</button>
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderSheet;