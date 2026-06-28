import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import Swal from "sweetalert2";
import { Plus, Trash2, X } from "lucide-react";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxes, setTaxes] = useState([]);
  const [selectedTax, setSelectedTax] = useState(null);
  const [status, setStatus] = useState("DRAFT");
  const [items, setItems] = useState([{ serviceId: "" }]);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  useEffect(() => {
    fetchClients();
    fetchServices();
    fetchTaxes();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get("/api/clients");
      setClients(res.data);
    } catch (err) { console.error("Error fetching clients", err); }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get("/api/services/fetch");
      const activeServices = (res.data || []).filter(s => s.active === "ACTIVE");
      setServices(activeServices);
    } catch (err) { console.error("Error fetching services", err); }
  };

  const fetchTaxes = async () => {
    try {
      const res = await api.get("/api/taxes");
      setTaxes(res.data);
    } catch (err) { console.error("Error fetching taxes", err); }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientId = params.get("clientId");
    if (clientId) setSelectedClientId(clientId);
  }, [location.search]);

  const addItem = () => setItems([...items, { serviceId: "" }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const filledItems = items.filter(i => i.serviceId);

    if (!selectedClientId || filledItems.length === 0) {
      return Swal.fire("Warning", "Select client and at least one service", "warning");
    }

    const payload = {
      clientId: Number(selectedClientId),
      invoiceDate,
      dueDate: dueDate || invoiceDate,
      taxPercentage: selectedTax?.percentage || 0,
      status,
      paymentStatus: paymentStatus,
      items: filledItems.map(i => ({ serviceId: Number(i.serviceId) }))
    };

    try {
      const res = await api.post("/api/invoices/create", payload);
      const invoiceId = res.data.id;

      Swal.fire({
        title: "Generating Invoice...",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/api/invoices/fetch/${invoiceId}`);
          const invoice = response.data;

          if (invoice.pdfUrl) {
            clearInterval(interval);
            Swal.close();
            navigate(-1);
            window.open(invoice.pdfUrl, "_blank");
          }

          if (invoice.status === "FAILED") {
            clearInterval(interval);
            Swal.fire("Error", "PDF generation failed", "error");
          }
        } catch (pollErr) {
          clearInterval(interval);
          Swal.close();
        }
      }, 1500);

    } catch (err) {
      Swal.fire("Error", "Failed to create invoice", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-[#1E293B]">
      <div className="bg-white rounded-[24px] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh] border border-gray-200">
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">Create Invoice</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Professional Billing System</p>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/30">
          
          <div className="p-4 bg-[#F1F5F9] rounded-xl border border-gray-200 shadow-sm min-h-[70px] flex flex-col justify-center">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Customer Selection</label>
            <select 
              value={selectedClientId} 
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-transparent font-bold text-[13px] outline-none border-none p-0 cursor-pointer text-gray-800"
            >
              <option value="">Choose a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#F1F5F9] rounded-xl border border-gray-200 shadow-sm min-h-[70px] flex flex-col justify-center">
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} 
                className="w-full bg-transparent font-bold text-[13px] outline-none border-none p-0 text-gray-800" />
            </div>
            <div className="p-4 bg-[#F1F5F9] rounded-xl border border-gray-200 shadow-sm min-h-[70px] flex flex-col justify-center">
              <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} 
                className="w-full bg-transparent font-bold text-[13px] outline-none border-none p-0 text-gray-800" />
            </div>
          </div>

          <div className="p-4 bg-[#F1F5F9] rounded-xl border border-gray-200 shadow-sm min-h-[70px] flex flex-col justify-center">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Tax Configuration</label>
            <select
              value={selectedTax?.id || ""}
              onChange={(e) => setSelectedTax(taxes.find(t => t.id === Number(e.target.value)))}
              className="w-full bg-transparent font-bold text-[13px] outline-none border-none p-0 cursor-pointer text-gray-800"
            >
              <option value="">Select Tax Type</option>
              {taxes.map((tax) => (
                <option key={tax.id} value={tax.id}>
                  {tax.name} ({tax.percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Services & Items</label>
              <button onClick={addItem} className="text-[10px] font-black text-blue-700 uppercase bg-blue-100/50 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-all">+ Add</button>
            </div>
            
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm group hover:border-blue-300 transition-all min-h-[60px]">
                  <select 
                    value={item.serviceId} 
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].serviceId = e.target.value;
                      setItems(newItems);
                    }}
                    className="flex-1 bg-transparent font-bold text-[13px] outline-none border-none p-0 text-gray-700"
                  >
                    <option value="">Select Service...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.serviceName} - ₹{s.basePrice}</option>)}
                  </select>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-dashed border-gray-300">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-3 text-center">Payment Status</label>
            <div className="flex gap-3 px-4">
              <button
                type="button"
                onClick={() => setPaymentStatus("PAID")}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  paymentStatus === "PAID"
                    ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-100 scale-105"
                    : "bg-white border-gray-200 text-gray-400 hover:border-green-200"
                }`}
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("UNPAID")}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  paymentStatus === "UNPAID"
                    ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100 scale-105"
                    : "bg-white border-gray-200 text-gray-400 hover:border-red-200"
                }`}
              >
                Unpaid
              </button>
            </div>
          </div>

        </div>
        
        <div className="p-6 bg-white border-t border-gray-100">
          <div className="flex gap-3">
            <button onClick={() => navigate(-1)} className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-black text-[11px] uppercase rounded-xl hover:bg-gray-100 transition-all border border-gray-200">Discard</button>
            <button onClick={handleSubmit} className="flex-[2] py-3.5 bg-[#0052CC] text-white font-black text-[11px] uppercase rounded-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all tracking-widest">Generate Invoice</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateInvoice;