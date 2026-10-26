import 'package:flutter/material.dart';

import 'detail_panduan_page.dart';

class SemuaPanduanPage extends StatefulWidget {
  const SemuaPanduanPage({super.key});

  @override
  State<SemuaPanduanPage> createState() => _SemuaPanduanPageState();
}

class _SemuaPanduanPageState extends State<SemuaPanduanPage> {
  static const _disasterGuides = [
    'Saat Gempa Terjadi',
    'Evakuasi Banjir',
    'Pencegahan Karhutla',
    'Siaga Erupsi Gunung',
    'Menghadapi Tsunami',
    'Waspada Tanah Longsor',
    'Antisipasi Puting Beliung',
    'Kesiapsiagaan Kekeringan',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Semua Panduan Bencana'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF172033),
        elevation: 0,
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.2,
        ),
        itemCount: _disasterGuides.length,
        itemBuilder: (context, index) {
          final title = _disasterGuides[index];
          return Card(
            color: Colors.white,
            elevation: 0.5,
            margin: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => Navigator.push<void>(
                context,
                MaterialPageRoute<void>(
                  builder: (context) => DetailPanduanPage(title: title),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    const Icon(
                      Icons.health_and_safety_outlined,
                      color: Color(0xFFB84E00),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: Color(0xFF172033),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
