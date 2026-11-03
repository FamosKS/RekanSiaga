import 'package:flutter/material.dart';

class PublicDonationPage extends StatefulWidget {
  const PublicDonationPage({super.key});

  @override
  State<PublicDonationPage> createState() => _PublicDonationPageState();
}

class _PublicDonationPageState extends State<PublicDonationPage> {
  static const _donationAmounts = [100000, 250000, 500000];
  static const _minimumDonation = 10000;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _donationAmountController = TextEditingController();
  int? _selectedAmount;
  _PaymentMethod? _selectedPaymentMethod;
  String? _selectedPaymentOption;
  bool _hasAcceptedTerms = false;

  int get _donationAmount =>
      int.tryParse(_donationAmountController.text.replaceAll('.', '')) ?? 0;

  bool get _isDonationAmountValid => _donationAmount >= _minimumDonation;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _donationAmountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return ColoredBox(
      color: Colors.grey[50]!,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'RekanSiaga',
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[600],
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Donasi',
                style: textTheme.headlineMedium?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                'Berikan bantuan Anda dengan aman dan terpercaya untuk mendukung penanganan bencana.',
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[600],
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 14),
              Card(
                margin: EdgeInsets.zero,
                color: Colors.white,
                elevation: 1.5,
                shadowColor: Colors.black.withValues(alpha: 0.08),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _DonationField(
                        label: 'Nama Lengkap',
                        hint: 'Masukkan nama lengkap',
                        icon: Icons.person_outline,
                        controller: _nameController,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 9),
                      _DonationField(
                        label: 'Email',
                        hint: 'nama@email.com',
                        icon: Icons.mail_outline,
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 9),
                      _DonationField(
                        label: 'No. Telp.',
                        hint: '08xx xxxx xxxx',
                        icon: Icons.phone_outlined,
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 11),
                      Text(
                        'Jumlah Donasi',
                        style: textTheme.labelLarge?.copyWith(
                          color: const Color(0xFF172033),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 7),
                      SizedBox(
                        height: 40,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _donationAmounts.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(width: 7),
                          itemBuilder: (context, index) {
                            final amount = _donationAmounts[index];
                            final isSelected = _selectedAmount == amount;
                            return _DonationAmountOption(
                              amount: amount,
                              selected: isSelected,
                              onTap: () {
                                setState(() {
                                  _selectedAmount = amount;
                                  _donationAmountController.text = amount
                                      .toString();
                                });
                              },
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 9),
                      TextFormField(
                        controller: _donationAmountController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.black87),
                        onChanged: (_) {
                          setState(() {
                            _selectedAmount = null;
                          });
                        },
                        decoration: InputDecoration(
                          prefixText: 'Rp ',
                          hintText: 'Masukkan nominal donasi',
                          errorText:
                              _donationAmountController.text.isNotEmpty &&
                                  !_isDonationAmountValid
                              ? 'Minimal donasi Rp 10.000'
                              : null,
                          filled: true,
                          fillColor: const Color(0xFFF7F8FA),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 11,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(11),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Metode Pembayaran',
                        style: textTheme.labelLarge?.copyWith(
                          color: const Color(0xFF172033),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 7),
                      _PaymentMethodOption(
                        method: _PaymentMethod.bankTransfer,
                        selected:
                            _selectedPaymentMethod ==
                            _PaymentMethod.bankTransfer,
                        selectedOption:
                            _selectedPaymentMethod ==
                                _PaymentMethod.bankTransfer
                            ? _selectedPaymentOption
                            : null,
                        onTap: () =>
                            _choosePaymentMethod(_PaymentMethod.bankTransfer),
                      ),
                      const SizedBox(height: 7),
                      _PaymentMethodOption(
                        method: _PaymentMethod.eWallet,
                        selected:
                            _selectedPaymentMethod == _PaymentMethod.eWallet,
                        selectedOption:
                            _selectedPaymentMethod == _PaymentMethod.eWallet
                            ? _selectedPaymentOption
                            : null,
                        onTap: () =>
                            _choosePaymentMethod(_PaymentMethod.eWallet),
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          Checkbox(
                            value: _hasAcceptedTerms,
                            visualDensity: VisualDensity.compact,
                            activeColor: const Color(0xFFB84E00),
                            onChanged: (value) {
                              setState(() {
                                _hasAcceptedTerms = value ?? false;
                              });
                            },
                          ),
                          Expanded(
                            child: Text(
                              'Saya menyetujui bahwa informasi donasi ini benar',
                              style: textTheme.labelSmall?.copyWith(
                                color: Colors.blueGrey[600],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isDonationAmountValid
                              ? _submitDonation
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFB84E00),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            minimumSize: const Size.fromHeight(42),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(11),
                            ),
                            textStyle: textTheme.labelLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: const Text('Lanjutkan'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _choosePaymentMethod(_PaymentMethod method) async {
    final options = method == _PaymentMethod.bankTransfer
        ? const ['BCA', 'Mandiri', 'BNI', 'BRI', 'BSI']
        : const ['GoPay', 'OVO', 'DANA', 'ShopeePay'];
    final option = await showModalBottomSheet<String>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                method == _PaymentMethod.bankTransfer
                    ? 'Pilih Bank'
                    : 'Pilih E-Wallet',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            ...options.map(
              (option) => ListTile(
                leading: Icon(
                  method == _PaymentMethod.bankTransfer
                      ? Icons.account_balance_outlined
                      : Icons.wallet_outlined,
                ),
                title: Text(option),
                onTap: () => Navigator.pop(sheetContext, option),
              ),
            ),
          ],
        ),
      ),
    );

    if (option != null && mounted) {
      setState(() {
        _selectedPaymentMethod = method;
        _selectedPaymentOption = option;
      });
    }
  }

  void _submitDonation() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Simulasi donasi belum terhubung ke pembayaran.'),
        ),
      );
  }
}

class _DonationField extends StatelessWidget {
  const _DonationField({
    required this.label,
    required this.hint,
    required this.icon,
    required this.controller,
    this.keyboardType,
    this.textInputAction,
  });

  final String label;
  final String hint;
  final IconData icon;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(11),
      borderSide: BorderSide.none,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: textTheme.labelLarge?.copyWith(
            color: const Color(0xFF172033),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 5),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          style: const TextStyle(color: Colors.black87),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.blueGrey[300], fontSize: 12),
            prefixIcon: Icon(icon, size: 18, color: Colors.blueGrey[500]),
            filled: true,
            fillColor: const Color(0xFFF7F8FA),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 11,
            ),
            border: border,
            enabledBorder: border,
            focusedBorder: border.copyWith(
              borderSide: const BorderSide(
                color: Color(0xFFB84E00),
                width: 1.2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DonationAmountOption extends StatelessWidget {
  const _DonationAmountOption({
    required this.amount,
    required this.selected,
    required this.onTap,
  });

  final int amount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final borderColor = selected
        ? const Color(0xFFB84E00)
        : Colors.blueGrey.shade100;

    return Material(
      color: selected ? const Color(0xFFFFF4E8) : Colors.white,
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        key: ValueKey('donation-amount-$amount'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.payments_outlined,
                size: 15,
                color: Colors.blueGrey[600],
              ),
              const SizedBox(width: 5),
              Text(
                'Rp${_formatAmount(amount)}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatAmount(int value) {
    final digits = value.toString();
    final groups = <String>[];
    for (var end = digits.length; end > 0; end -= 3) {
      final start = end - 3 < 0 ? 0 : end - 3;
      groups.insert(0, digits.substring(start, end));
    }
    return groups.join('.');
  }
}

class _PaymentMethodOption extends StatelessWidget {
  const _PaymentMethodOption({
    required this.method,
    required this.selected,
    required this.selectedOption,
    required this.onTap,
  });

  final _PaymentMethod method;
  final bool selected;
  final String? selectedOption;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isBank = method == _PaymentMethod.bankTransfer;
    final accent = isBank ? const Color(0xFFB84E00) : const Color(0xFF14627A);
    final borderColor = selected ? accent : Colors.blueGrey.shade100;

    return Material(
      color: selected ? const Color(0xFFFFFAF5) : Colors.white,
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        key: ValueKey('payment-method-${method.name}'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: borderColor),
          ),
          child: ListTile(
            dense: true,
            minVerticalPadding: 5,
            leading: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                isBank ? Icons.account_balance_outlined : Icons.wallet_outlined,
                color: accent,
                size: 17,
              ),
            ),
            title: Text(
              selectedOption ?? (isBank ? 'Transfer Bank' : 'E-Wallet'),
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: const Color(0xFF172033),
                fontWeight: FontWeight.w700,
              ),
            ),
            subtitle: Text(
              selectedOption != null
                  ? (isBank ? 'Transfer Bank' : 'E-Wallet')
                  : isBank
                  ? 'Mandiri, BRI, BCA, BSI, BNI'
                  : 'DANA, GoPay, ShopeePay, QRIS',
              style: Theme.of(context).textTheme.labelSmall
                  ?.copyWith(color: Colors.blueGrey[500], fontSize: 10),
            ),
            trailing: Icon(
              selected ? Icons.check_circle : Icons.chevron_right,
              color: selected ? accent : Colors.blueGrey[400],
              size: 19,
            ),
          ),
        ),
      ),
    );
  }
}

enum _PaymentMethod { bankTransfer, eWallet }
