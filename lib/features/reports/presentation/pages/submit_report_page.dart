import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/routing/app_router.dart';
import '../../../dashboard/presentation/providers/active_reports_provider.dart';
import '../providers/submit_report_provider.dart';

class SubmitReportPage extends ConsumerStatefulWidget {
  const SubmitReportPage({this.onSubmitted, super.key});

  final VoidCallback? onSubmitted;

  @override
  ConsumerState<SubmitReportPage> createState() => _SubmitReportPageState();
}

class _SubmitReportPageState extends ConsumerState<SubmitReportPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _koordinatController = TextEditingController();
  final _reporterNameController = TextEditingController();
  final _reporterAddressController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  XFile? _fotoBukti;
  String? _selectedReportType;

  static const List<String> _disasterTypes = [
    'Banjir',
    'Gempa Bumi',
    'Tanah Longsor',
    'Kebakaran Hutan/Lahan',
    'Angin Puting Beliung',
    'Gunung Meletus',
    'Tsunami',
    'Lainnya',
  ];

  double? _latitude;
  double? _longitude;
  bool _isLoadingLocation = false;

  @override
  void initState() {
    super.initState();
    unawaited(_isiKoordinatOtomatis());
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _koordinatController.dispose();
    _reporterNameController.dispose();
    _reporterAddressController.dispose();
    super.dispose();
  }

  Future<void> _isiKoordinatOtomatis() async {
    if (_isLoadingLocation) return;

    setState(() {
      _isLoadingLocation = true;
    });

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showLocationError(
          'Aktifkan layanan lokasi untuk mengambil koordinat.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showLocationError('Izin lokasi diperlukan untuk mengambil koordinat.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (!mounted) return;

      _latitude = position.latitude;
      _longitude = position.longitude;
      _koordinatController.text = '${position.latitude}, ${position.longitude}';
    } on LocationServiceDisabledException {
      _showLocationError('Aktifkan layanan lokasi untuk mengambil koordinat.');
    } on PermissionDeniedException {
      _showLocationError('Izin lokasi diperlukan untuk mengambil koordinat.');
    } on PlatformException catch (error, stackTrace) {
      debugPrint('Unable to get current location: $error\n$stackTrace');
      _showLocationError('Koordinat lokasi tidak dapat diambil saat ini.');
    } on MissingPluginException catch (error, stackTrace) {
      debugPrint('Location plugin is unavailable: $error\n$stackTrace');
      _showLocationError('Fitur lokasi tidak tersedia pada perangkat ini.');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
        });
      }
    }
  }

  void _showLocationError(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<SubmitReportState>(submitReportControllerProvider, (
      previous,
      next,
    ) {
      if (next.status == SubmitReportStatus.success) {
        ref.invalidate(activeReportsProvider);
        final onSubmitted = widget.onSubmitted;
        if (onSubmitted != null) {
          onSubmitted();
        }
      }
    });

    final state = ref.watch(submitReportControllerProvider);
    final isLoading = state.status == SubmitReportStatus.loading;
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    Widget fieldLabel(IconData icon, String label) {
      return Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF586174)),
          const SizedBox(width: 7),
          Text(
            label,
            style: textTheme.labelLarge?.copyWith(
              color: const Color(0xFF172033),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      );
    }

    InputDecoration fieldDecoration({
      required String hint,
      required IconData icon,
      bool alignLabelWithHint = false,
    }) {
      final border = OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      );

      return InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.blueGrey[300], fontSize: 13),
        prefixIcon: Icon(icon, size: 18, color: Colors.blueGrey[400]),
        filled: true,
        fillColor: const Color(0xFFF7F8FA),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 13,
        ),
        alignLabelWithHint: alignLabelWithHint,
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: BorderSide(color: colorScheme.secondary, width: 1.3),
        ),
        errorBorder: border.copyWith(
          borderSide: BorderSide(color: colorScheme.error),
        ),
        focusedErrorBorder: border.copyWith(
          borderSide: BorderSide(color: colorScheme.error, width: 1.3),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: SafeArea(
        child: Form(
          key: _formKey,
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
                  'Laporan Kejadian',
                  style: textTheme.headlineMedium?.copyWith(
                    color: const Color(0xFF172033),
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () => context.push(AppRoutes.myReports),
                    icon: const Icon(Icons.receipt_long_outlined, size: 18),
                    label: const Text('Laporan Saya'),
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  'Laporkan kejadian lapangan dengan data yang jelas dan lengkap untuk mendukung respon cepat.',
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
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        fieldLabel(Icons.person_outline, 'Nama Pelapor'),
                        const SizedBox(height: 7),
                        TextFormField(
                          key: const ValueKey('reporter-name-visual-field'),
                          controller: _reporterNameController,
                          textInputAction: TextInputAction.next,
                          style: const TextStyle(color: Colors.black87),
                          decoration: fieldDecoration(
                            hint: 'Masukkan nama lengkap',
                            icon: Icons.person_outline,
                          ),
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(
                          Icons.location_on_outlined,
                          'Alamat Pelapor',
                        ),
                        const SizedBox(height: 7),
                        TextFormField(
                          key: const ValueKey('reporter-address-visual-field'),
                          controller: _reporterAddressController,
                          textInputAction: TextInputAction.next,
                          style: const TextStyle(color: Colors.black87),
                          decoration: fieldDecoration(
                            hint: 'Masukkan alamat lengkap',
                            icon: Icons.location_on_outlined,
                          ),
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(Icons.image_outlined, 'Tambah Foto'),
                        const SizedBox(height: 7),
                        InkWell(
                          onTap: _pilihFoto,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFAFBFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.blueGrey.shade100,
                                style: BorderStyle.solid,
                              ),
                            ),
                            child: Row(
                              children: [
                                if (_fotoBukti != null)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: kIsWeb
                                        ? Image.network(
                                            _fotoBukti!.path,
                                            width: 44,
                                            height: 44,
                                            fit: BoxFit.cover,
                                          )
                                        : Image.file(
                                            File(_fotoBukti!.path),
                                            width: 44,
                                            height: 44,
                                            fit: BoxFit.cover,
                                          ),
                                  )
                                else
                                  Icon(
                                    Icons.camera_alt_outlined,
                                    size: 18,
                                    color: Colors.blueGrey[500],
                                  ),
                                const SizedBox(width: 9),
                                Expanded(
                                  child: Text(
                                    _fotoBukti?.name ?? 'Pilih foto bukti',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: textTheme.bodySmall?.copyWith(
                                      color: Colors.blueGrey[600],
                                    ),
                                  ),
                                ),
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: Colors.blueGrey.shade100,
                                    ),
                                  ),
                                  child: IconButton(
                                    padding: EdgeInsets.zero,
                                    onPressed: _fotoBukti == null
                                        ? null
                                        : () =>
                                              setState(() => _fotoBukti = null),
                                    icon: Icon(
                                      _fotoBukti == null
                                          ? Icons.add
                                          : Icons.close,
                                      size: 18,
                                      color: Colors.blueGrey[700],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(
                          Icons.my_location_outlined,
                          'Lokasi (Koordinat)',
                        ),
                        const SizedBox(height: 7),
                        TextFormField(
                          key: const ValueKey('report-location-visual-field'),
                          controller: _koordinatController,
                          readOnly: true,
                          textInputAction: TextInputAction.next,
                          style: const TextStyle(color: Colors.black87),
                          decoration:
                              fieldDecoration(
                                hint: 'Koordinat lokasi akan terisi otomatis',
                                icon: Icons.my_location_outlined,
                              ).copyWith(
                                suffixIcon: _isLoadingLocation
                                    ? const Padding(
                                        padding: EdgeInsets.all(12),
                                        child: SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        ),
                                      )
                                    : IconButton(
                                        key: const ValueKey(
                                          'refresh-location-button',
                                        ),
                                        tooltip: 'Perbarui koordinat',
                                        onPressed: _isiKoordinatOtomatis,
                                        icon: const Icon(Icons.refresh),
                                      ),
                              ),
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(Icons.title_outlined, 'Judul Laporan'),
                        const SizedBox(height: 7),
                        TextFormField(
                          key: const ValueKey('report-title-field'),
                          controller: _titleController,
                          textInputAction: TextInputAction.next,
                          style: const TextStyle(color: Colors.black87),
                          decoration: fieldDecoration(
                            hint: 'Contoh: Banjir di wilayah utara',
                            icon: Icons.title_outlined,
                          ),
                          validator: (value) => _requiredField(value, 'Judul'),
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(Icons.category_outlined, 'Jenis Laporan'),
                        const SizedBox(height: 7),
                        DropdownButtonFormField<String>(
                          key: const ValueKey('report-type-field'),
                          initialValue: _selectedReportType,
                          dropdownColor: Colors.white,
                          style: const TextStyle(
                            color: Color(0xFF1E293B),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          icon: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            color: Color(0xFF64748B),
                          ),
                          decoration: fieldDecoration(
                            hint: 'Pilih jenis bencana...',
                            icon: Icons.category_outlined,
                          ),
                          hint: const Text('Pilih jenis bencana...'),
                          items: [
                            for (final type in _disasterTypes)
                              DropdownMenuItem<String>(
                                value: type,
                                child: Text(
                                  type,
                                  style: const TextStyle(
                                    color: Color(0xFF1E293B),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                          ],
                          validator: (value) => value == null || value.isEmpty
                              ? 'Jenis bencana wajib dipilih.'
                              : null,
                          onChanged: (value) {
                            setState(() {
                              _selectedReportType = value;
                            });
                          },
                        ),
                        const SizedBox(height: 11),
                        fieldLabel(Icons.description_outlined, 'Isi Laporan'),
                        const SizedBox(height: 7),
                        TextFormField(
                          key: const ValueKey('report-description-field'),
                          controller: _descriptionController,
                          minLines: 4,
                          maxLines: 4,
                          textInputAction: TextInputAction.newline,
                          style: const TextStyle(color: Colors.black87),
                          decoration: fieldDecoration(
                            hint: 'Deskripsikan kejadian, dampak, dan kebutuhan bantuan lapangan.',
                            icon: Icons.description_outlined,
                            alignLabelWithHint: true,
                          ),
                          validator: (value) =>
                              _requiredField(value, 'Deskripsi'),
                        ),
                        const SizedBox(height: 7),
                        FormField<bool>(
                          initialValue: false,
                          builder: (field) => Row(
                            children: [
                              Checkbox(
                                value: field.value ?? false,
                                visualDensity: VisualDensity.compact,
                                activeColor: const Color(0xFFB84E00),
                                onChanged: field.didChange,
                              ),
                              Expanded(
                                child: Text(
                                  'Saya menyetujui bahwa informasi laporan ini benar',
                                  style: textTheme.labelSmall?.copyWith(
                                    color: const Color(0xFF30394A),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 5),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: isLoading ? null : _submit,
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
                            child: isLoading
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Submit'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  margin: EdgeInsets.zero,
                  color: const Color(0xFFFFF4E8),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: Color(0xFFFFDFC2)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: const BoxDecoration(
                            color: Color(0xFFB84E00),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.location_on_outlined,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Perlu Bantuan Segera?',
                                style: textTheme.labelLarge?.copyWith(
                                  color: const Color(0xFF172033),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Hubungi Relawan Terdekat',
                                style: textTheme.bodySmall?.copyWith(
                                  color: Colors.blueGrey[600],
                                ),
                              ),
                            ],
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
      ),
    );
  }

  String? _requiredField(String? value, String label) {
    if (value == null || value.trim().isEmpty) {
      return '$label wajib diisi.';
    }
    return null;
  }

  Future<void> _pilihFoto() async {
    final foto = await _picker.pickImage(source: ImageSource.gallery);
    if (foto != null && mounted) {
      setState(() {
        _fotoBukti = foto;
      });
    }
  }

  void _resetForm() {
    if (!mounted) return;
    setState(() {
      _formKey.currentState?.reset();
      _reporterNameController.clear();
      _reporterAddressController.clear();
      _titleController.clear();
      _descriptionController.clear();
      _koordinatController.clear();
      _latitude = null;
      _longitude = null;
      _fotoBukti = null;
      _selectedReportType = null;
    });
  }

  Future<void> _showSuccessDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          insetPadding: const EdgeInsets.symmetric(horizontal: 24),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 700),
                  curve: Curves.elasticOut,
                  builder: (context, value, child) {
                    return Transform.scale(scale: value, child: child);
                  },
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: Colors.green,
                    size: 84,
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Laporan Diterima!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF1E293B),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Terima kasih! Informasi yang Anda laporkan telah masuk ke sistem dan akan segera diproses oleh tim RekanSiaga.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFC05621),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      minimumSize: const Size.fromHeight(44),
                    ),
                    onPressed: () {
                      Navigator.of(dialogContext).pop();
                      _resetForm();
                    },
                    child: const Text('Selesai'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submit() async {
    if (_selectedReportType == null || _selectedReportType!.isEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Pilih jenis bencana terlebih dahulu'),
            backgroundColor: Colors.orange,
          ),
        );
      return;
    }

    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_descriptionController.text.trim().length < 15) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Isi laporan terlalu singkat. Mohon jelaskan situasi minimal 15 karakter agar informasi jelas.',
            ),
            backgroundColor: Colors.orange,
          ),
        );
      return;
    }

    try {
      await ref
          .read(submitReportControllerProvider.notifier)
          .submit(
            title: _titleController.text,
            description: _descriptionController.text,
            reportType: _selectedReportType!,
            latitude: _latitude,
            longitude: _longitude,
          );
      if (!mounted) return;

      await _showSuccessDialog(context);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('Gagal mengirim laporan: $error'),
            backgroundColor: Colors.red,
          ),
        );
    }
  }
}
