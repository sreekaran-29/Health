import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../Context/AuthContext';
import { getSubscriptionById, saveSubscription } from '../../Services/SubscriptionService';
import { APPRoutes } from '../../Utils/Route';

const STATUS_OPTIONS = [
    { id: 1, label: 'Active' },
    { id: 2, label: 'Inactive' },
];

const emptyForm = {
    id: null,
    name: '',
    description: '',
    status_id: 1,
    doctors_limit: '',
    patients_limit: '',
    storage_size: '',
    is_recurring: true,
    monthly_price: '',
    yearly_price: '',
    monthly_price_id: '',
    yearly_price_id: '',
};

const validationSchema = Yup.object({
    name: Yup.string().trim().required('Name is required'),
    description: Yup.string().trim().required('Description is required'),
    status_id: Yup.number().oneOf([1, 2]).required('Status is required'),
    doctors_limit: Yup.number()
        .typeError('No.of.Doctors must be a number')
        .min(0, 'No.of.Doctors cannot be negative')
        .required('No.of.Doctors is required'),
    patients_limit: Yup.number()
        .typeError('No.of.Patients must be a number')
        .min(0, 'No.of.Patients cannot be negative')
        .required('No.of.Patients is required'),
    storage_size: Yup.number()
        .typeError('Storage Size must be a number')
        .min(0, 'Storage Size cannot be negative')
        .required('Storage Size is required'),
    monthly_price: Yup.number()
        .typeError('Monthly Price must be a number')
        .min(0, 'Monthly Price cannot be negative')
        .required('Monthly Price is required'),
    yearly_price: Yup.number()
        .typeError('Yearly Price must be a number')
        .min(0, 'Yearly Price cannot be negative')
        .required('Yearly Price is required'),
});

const getPriceByMethod = (priceDetails, billingMethod) => {
    if (!Array.isArray(priceDetails)) {
        return null;
    }

    const methodSet = billingMethod === 'month'
        ? ['month', 'monthly']
        : ['year', 'yearly'];

    const detail = priceDetails.find((item) =>
        methodSet.includes((item?.billing_method || '').toLowerCase()),
    );

    return detail?.price ?? null;
};

const mapApiToForm = (subscriptionData) => {
    const data = subscriptionData || {};
    const pricesFromList = Array.isArray(data?.Price) ? data.Price : null;

    const monthlyPriceFromDetails = getPriceByMethod(data?.price_details, 'month');
    const yearlyPriceFromDetails = getPriceByMethod(data?.price_details, 'year');

    const monthlyPrice =
        pricesFromList?.[0] ??
        data?.monthly_price ??
        monthlyPriceFromDetails ??
        '';

    const yearlyPrice =
        pricesFromList?.[1] ??
        data?.yearly_price ??
        yearlyPriceFromDetails ??
        '';

    return {
        id: data?.id ?? data?.Id ?? null,
        name: data?.name ?? data?.Name ?? '',
        description: data?.description ?? data?.Description ?? '',
        status_id: Number(data?.status_id ?? data?.StatusId) === 2 ? 2 : 1,
        doctors_limit: data?.doctors_limit ?? data?.DoctorsLimit ?? '',
        patients_limit: data?.patients_limit ?? data?.PatientsLimit ?? '',
        storage_size: data?.storage_size ?? data?.StorageSize ?? '',
        is_recurring: Boolean(data?.is_recurring ?? data?.IsRecurring),
        monthly_price: monthlyPrice,
        yearly_price: yearlyPrice,
        monthly_price_id: data?.monthly_price_id ?? data?.MonthlyPriceId ?? '',
        yearly_price_id: data?.yearly_price_id ?? data?.YearlyPriceId ?? '',
    };
};

const buildPayload = (values, isEdit) => {
    return {
        Id: values.id || null,
        Name: values.name,
        Description: values.description,
        StatusId: Number(values.status_id),
        DoctorsLimit: Number(values.doctors_limit),
        PatientsLimit: Number(values.patients_limit),
        StorageSize: Number(values.storage_size),
        Price: [Number(values.monthly_price), Number(values.yearly_price)],
        IsRecurring: Boolean(values.is_recurring),
        BillingMethod: ['month', 'year'],
        Type: isEdit ? 'update' : 'create',
        MonthlyPriceId: values.monthly_price_id || null,
        YearlyPriceId: values.yearly_price_id || null,
    };
};

export default function SubscriptionForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { token } = useAuth();
    const isEdit = Boolean(id);

    const [loading, setLoading] = React.useState(isEdit);

    const formik = useFormik({
        initialValues: emptyForm,
        enableReinitialize: false,
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = buildPayload(values, isEdit);
                const response = await saveSubscription(payload, token);

                if (response?.is_success) {
                    toast.success(response?.message || 'Subscription saved successfully');
                    const targetId = response?.data || values.id;
                    if (targetId) {
                        navigate(APPRoutes.SUBSCRIPTION_VIEW.replace(':id', targetId));
                        return;
                    }
                    navigate(APPRoutes.SUBSCRIPTION_MANAGE_PLANS);
                    return;
                } else if(response?.is_success === false && response?.status_code === 500) {
                    toast.error('Internal Server Error. Please Contact Support Team.');
                } else {
                    toast.error(response?.message || 'Failed to save subscription');
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to save subscription');
            }
        },
    });

    React.useEffect(() => {
        if (!isEdit || !token) {
            setLoading(false);
            return;
        }

        const loadSubscription = async () => {
            try {
                setLoading(true);
                const response = await getSubscriptionById(id, token);
                if (response?.is_success){
                    const subscriptionData = response?.data || null;
                    formik.setValues(mapApiToForm(subscriptionData));
                } else if(response?.is_success === false && response?.status_code === 500) {
                    toast.error('Internal Server Error. Please Contact Support Team.');
                } else {
                    toast.error(response?.message || 'Failed to load subscription');
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load subscription');
            } finally {
                setLoading(false);
            }
        };

        loadSubscription();
    }, [isEdit, token, id, navigate]);

    const renderAsterisk = () => <span className="text-danger">*</span>;

    if (loading) {
        return (
            <div className="spinner">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container p-0">
            <div className="rounded-4 bg-white p-2 p-md-4 shadow-lg border-0">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            type="button"
                            className="btn btn-light border rounded-circle shadow-sm"
                            onClick={() => navigate(-1)}
                            style={{ width: 40, height: 40 }}
                        >
                            &larr;
                        </button>
                        <div>
                            <h3 className="fw-bold mb-0 hc-text-primary">
                                {isEdit ? 'Edit Subscription' : 'Create Subscription'}
                            </h3>
                            <small className="text-muted">
                                Manage plan details, limits and billing setup
                            </small>
                        </div>
                    </div>
                </div>

                <form onSubmit={formik.handleSubmit}>
                    <div className="mb-4 p-4 rounded-4 border bg-light-subtle">
                        <h6 className="fw-bold hc-text-primary mb-3">Subscription Details</h6>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Name {renderAsterisk()}</label>
                                <input
                                    name="name"
                                    placeholder="Subscription name"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.name && formik.errors.name ? 'is-invalid' : ''}`}
                                    {...formik.getFieldProps('name')}
                                />
                                <div className="invalid-feedback">{formik.errors.name}</div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Status {renderAsterisk()}</label>
                                <select
                                    name="status_id"
                                    className={`form-select rounded-3 shadow-sm ${formik.touched.status_id && formik.errors.status_id ? 'is-invalid' : ''}`}
                                    value={formik.values.status_id}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="invalid-feedback">{formik.errors.status_id}</div>
                            </div>
                        </div>

                        <div className="row g-3 mt-1">
                            <div className="col-12">
                                <label className="form-label fw-semibold">Description {renderAsterisk()}</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    placeholder="Plan description"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.description && formik.errors.description ? 'is-invalid' : ''}`}
                                    {...formik.getFieldProps('description')}
                                />
                                <div className="invalid-feedback">{formik.errors.description}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 p-4 rounded-4 border bg-light-subtle">
                        <h6 className="fw-bold hc-text-primary mb-3">Billing & Recurrence Details</h6>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Monthly Price {renderAsterisk()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="monthly_price"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.monthly_price && formik.errors.monthly_price ? 'is-invalid' : ''}`}
                                    value={formik.values.monthly_price}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={isEdit}
                                    disabled={isEdit}
                                />
                                <div className="invalid-feedback">{formik.errors.monthly_price}</div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Yearly Price {renderAsterisk()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="yearly_price"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.yearly_price && formik.errors.yearly_price ? 'is-invalid' : ''}`}
                                    value={formik.values.yearly_price}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    readOnly={isEdit}
                                    disabled={isEdit}
                                />
                                <div className="invalid-feedback">{formik.errors.yearly_price}</div>
                            </div>
                        </div>

                        <div className="row g-3 mt-1">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">MonthlyPriceId</label>
                                <input
                                    name="monthly_price_id"
                                    className="form-control rounded-3 shadow-sm"
                                    value={formik.values.monthly_price_id || '-'}
                                    readOnly
                                    disabled
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">YearlyPriceId</label>
                                <input
                                    name="yearly_price_id"
                                    className="form-control rounded-3 shadow-sm"
                                    value={formik.values.yearly_price_id || '-'}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="form-check form-switch mt-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="isRecurring"
                                checked={formik.values.is_recurring}
                                onChange={(event) =>
                                    formik.setFieldValue('is_recurring', event.target.checked)
                                }
                                disabled={isEdit}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="isRecurring">
                                Is recurring
                            </label>
                        </div>
                    </div>

                    <div className="mb-4 p-4 rounded-4 border bg-light-subtle">
                        <h6 className="fw-bold hc-text-primary mb-3">Limits Details</h6>

                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">No.of.Doctors {renderAsterisk()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="doctors_limit"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.doctors_limit && formik.errors.doctors_limit ? 'is-invalid' : ''}`}
                                    value={formik.values.doctors_limit}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                <div className="invalid-feedback">{formik.errors.doctors_limit}</div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">No.of.Patients {renderAsterisk()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="patients_limit"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.patients_limit && formik.errors.patients_limit ? 'is-invalid' : ''}`}
                                    value={formik.values.patients_limit}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                <div className="invalid-feedback">{formik.errors.patients_limit}</div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Storage Size (GB) {renderAsterisk()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="storage_size"
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.storage_size && formik.errors.storage_size ? 'is-invalid' : ''}`}
                                    value={formik.values.storage_size}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                                <div className="invalid-feedback">{formik.errors.storage_size}</div>
                            </div>
                        </div>

                    </div>

                    <div className="text-end mt-4">
                        <button
                            type="submit"
                            className="btn hc-bg-primary text-white px-5 py-2 rounded-3 fw-semibold shadow"
                            disabled={formik.isSubmitting}
                        >
                            {formik.isSubmitting ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
