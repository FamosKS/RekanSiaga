import 'package:flutter/material.dart';

class CeklisTasSiagaPage extends StatefulWidget {
  const CeklisTasSiagaPage({super.key});

  @override
  State<CeklisTasSiagaPage> createState() => _CeklisTasSiagaPageState();
}

class _CeklisTasSiagaPageState extends State<CeklisTasSiagaPage> {
  final List<Map<String, dynamic>> _checklistItems = [
    {
      'title': 'Surat & Dokumen Penting',
      'subtitle':
          'Fotokopi KTP, KK, sertifikat, buku tabungan dalam plastik kedap air',
      'isDone': false,
    },
    {
      'title': 'Kotak P3K & Obat Pribadi',
      'subtitle': 'Perban, antiseptik, obat-obatan rutin',
      'isDone': false,
    },
    {
      'title': 'Air Minum & Makanan',
      'subtitle': 'Persediaan minimal untuk 3 hari, makanan kaleng/tahan lama',
      'isDone': false,
    },
    {
      'title': 'Pakaian Ganti',
      'subtitle': 'Baju, celana, jaket, jas hujan, pakaian dalam',
      'isDone': false,
    },
    {
      'title': 'Alat Penerangan',
      'subtitle': 'Senter dan baterai cadangan',
      'isDone': false,
    },
    {
      'title': 'Peluit',
      'subtitle': 'Untuk alat sinyal darurat meminta pertolongan',
      'isDone': false,
    },
    {
      'title': 'Uang Tunai',
      'subtitle': 'Siapkan pecahan kecil secukupnya untuk transaksi darurat',
      'isDone': false,
    },
    {
      'title': 'Elektronik',
      'subtitle': 'Ponsel, kabel, dan Powerbank terisi penuh',
      'isDone': false,
    },
    {
      'title': 'Perlengkapan Mandi',
      'subtitle': 'Sabun, sikat gigi, handuk kecil',
      'isDone': false,
    },
  ];

  double get _progress {
    final completedItems = _checklistItems
        .where((item) => item['isDone'] == true)
        .length;
    return completedItems / _checklistItems.length;
  }

  @override
  Widget build(BuildContext context) {
    final progress = _progress;
    final progressPercent = (progress * 100).toInt();

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Tas Siaga'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Kesiapan Tas Siaga Anda: $progressPercent%',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.black87,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: progress),
                  duration: const Duration(milliseconds: 350),
                  builder: (context, animatedProgress, child) {
                    return LinearProgressIndicator(
                      value: animatedProgress,
                      color: const Color(0xFFB84E00),
                      backgroundColor: Colors.grey.shade200,
                    );
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _checklistItems.length,
              itemBuilder: (context, index) {
                final item = _checklistItems[index];
                return Card(
                  color: Colors.white,
                  elevation: 0.5,
                  margin: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: CheckboxListTile(
                    title: Text(
                      item['title'] as String,
                      style: const TextStyle(color: Colors.black87),
                    ),
                    subtitle: Text(
                      item['subtitle'] as String,
                      style: const TextStyle(color: Colors.black54),
                    ),
                    value: item['isDone'] as bool,
                    activeColor: const Color(0xFFB84E00),
                    onChanged: (isDone) {
                      setState(() {
                        item['isDone'] = isDone ?? false;
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: ElevatedButton(
          onPressed: () => Navigator.pop(context, _progress),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFB84E00),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: const Text('Simpan & Selesai'),
        ),
      ),
    );
  }
}
