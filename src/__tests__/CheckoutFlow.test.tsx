import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import i18next from '../js/i18nextInit';
import CheckoutFlow from '../js/library/components/CheckoutFlow';

const mockAccessories = [
  { value: 'panniers', label: { en: 'Panniers', es: 'Alforjas' } },
  { value: 'front-basket', label: { en: 'Front basket', es: 'Canasta delantera' } },
];
const mockFeeDescription = {
  rates: [
    {
      label: { en: 'Up to 5 hours', es: 'Hasta 5 horas' },
      duration_hours: [0, 1] as [number, number],
    },
  ],
  subgroup_notes: {
    discount: {
      en: 'Discount members pay 30% of these rates.',
      es: 'Los miembros con descuento pagan el 30% de estas tarifas.',
    },
  },
};

describe('CheckoutFlow', () => {
  const mockEstimateFee = jest.fn((hours: number) => hours * 2);
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    await i18next.changeLanguage('en');
  });

  it('initially hides accessory checkboxes until long-term rental is selected', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        accessories={mockAccessories}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    // Gating question is visible
    expect(tree.getByText('Do you plan to keep the vehicle for 1 week or longer?')).toBeTruthy();

    // Accessory checkboxes are not visible initially
    expect(tree.queryByText('Panniers')).toBeNull();
    expect(tree.queryByText('Front basket')).toBeNull();

    // Select Yes on the segmented button
    fireEvent.press(tree.getByText('Yes'));

    // Accessory checkboxes are now visible
    expect(tree.getByText('Panniers')).toBeTruthy();
    expect(tree.getByText('Front basket')).toBeTruthy();
  });

  it('submits checkout without accessories when not selected', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        accessories={mockAccessories}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));

    expect(mockOnConfirm).toHaveBeenCalledWith(38000, []);
  });

  it('submits selected accessories when long-term is checked and accessories are selected', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        accessories={mockAccessories}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    // Select Yes
    fireEvent.press(tree.getByText('Yes'));

    // Check panniers and front basket
    fireEvent.press(tree.getByText('Panniers'));
    fireEvent.press(tree.getByText('Front basket'));

    fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));

    expect(mockOnConfirm).toHaveBeenCalledWith(38000, ['Panniers', 'Front basket']);
  });

  it('clears selected accessories if long-term is toggled off', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        accessories={mockAccessories}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    // Select Yes and select an accessory
    fireEvent.press(tree.getByText('Yes'));
    fireEvent.press(tree.getByText('Panniers'));

    // Select No
    fireEvent.press(tree.getByText('No'));

    // Submit checkout
    fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));

    expect(mockOnConfirm).toHaveBeenCalledWith(38000, []);
  });

  it('does not prompt about rental length or accessories when none are configured', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(tree.queryByText('Do you plan to keep the vehicle for 1 week or longer?')).toBeNull();
    fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));
    expect(mockOnConfirm).toHaveBeenCalledWith(38000, []);
  });

  it('uses the configured label for the current language', async () => {
    await i18next.changeLanguage('es');
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={38000}
        accessories={mockAccessories}
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.press(tree.getByText('Sí'));
    expect(tree.getByText('Alforjas')).toBeTruthy();
    expect(tree.getByText('Canasta delantera')).toBeTruthy();
  });

  it('shows configured rates in the current language', () => {
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={0}
        feeDescription={mockFeeDescription}
        subgroup="public"
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(tree.getByText('Up to 5 hours')).toBeTruthy();
    expect(tree.getByText('$2/hour')).toBeTruthy();
    expect(
      tree.getByText(
        'After the first 24 hours, additional time is prorated hourly at the applicable daily rate.',
      ),
    ).toBeTruthy();
    expect(tree.queryByText('Discount members pay 30% of these rates.')).toBeNull();
  });

  it('localizes rate labels, units, and notes for the active language', async () => {
    i18next.addResourceBundle(
      'es',
      'translation',
      {
        library: {
          checkout: {
            'per-hour': '/hora',
            'proration-note':
              'Después de las primeras 24 horas, el tiempo adicional se prorratea por hora según la tarifa diaria correspondiente.',
          },
        },
      },
      true,
      true,
    );
    await i18next.changeLanguage('es');
    const tree = render(
      <CheckoutFlow
        vehicleId="bike-101"
        paymentProcessing={false}
        holdAmountCents={0}
        feeDescription={mockFeeDescription}
        subgroup="discount"
        feeForDuration={mockEstimateFee}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );

    expect(tree.getByText('Hasta 5 horas')).toBeTruthy();
    expect(tree.getByText('$2/hora')).toBeTruthy();
    expect(
      tree.getByText(
        'Después de las primeras 24 horas, el tiempo adicional se prorratea por hora según la tarifa diaria correspondiente.',
      ),
    ).toBeTruthy();
    expect(
      tree.getByText('Los miembros con descuento pagan el 30% de estas tarifas.'),
    ).toBeTruthy();
    expect(tree.queryByText('Discount members pay 30% of these rates.')).toBeNull();
  });
});
