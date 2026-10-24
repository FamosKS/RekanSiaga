import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../reports/presentation/pages/submit_report_page.dart';
import 'public_donation_page.dart';
import 'public_home_page.dart';
import 'public_information_page.dart';
import 'public_map_page.dart';

class PublicMainPage extends StatefulWidget {
  const PublicMainPage({super.key});

  @override
  State<PublicMainPage> createState() => _PublicMainPageState();
}

class _PublicMainPageState extends State<PublicMainPage> {
  int _selectedIndex = 0;

  late final List<Widget> _pages = [
    PublicHomePage(
      onOpenMap: () => _selectTab(2),
      onOpenReport: () => _selectTab(3),
      onOpenEmergency: _openEmergency,
    ),
    PublicInformationPage(
      onOpenMap: () => _selectTab(2),
      onOpenEmergency: _openEmergency,
      onOpenMonitoring: _openMonitoring,
    ),
    PublicMapPage(onEmergencyTap: _openEmergency),
    SubmitReportPage(
      onSubmitted: () {
        _selectTab(0);
      },
    ),
    const PublicDonationPage(),
  ];

  static const _destinations = [
    BottomNavigationBarItem(
      icon: Icon(Icons.home_outlined),
      activeIcon: Icon(Icons.home),
      label: 'Beranda',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.article_outlined),
      activeIcon: Icon(Icons.article),
      label: 'Informasi',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.map_outlined),
      activeIcon: Icon(Icons.map),
      label: 'Peta',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.note_add_outlined),
      activeIcon: Icon(Icons.note_add),
      label: 'Lapor',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.paid_outlined),
      activeIcon: Icon(Icons.paid),
      label: 'Donasi',
    ),
  ];

  void _selectTab(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _openEmergency() {
    context.push('/sos');
  }

  void _openMonitoring() {
    context.push('/pemantauan');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: IndexedStack(index: _selectedIndex, children: _pages),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _selectedIndex,
        items: _destinations,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFFB84E00),
        unselectedItemColor: const Color(0xFF737987),
        selectedLabelStyle: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
        ),
        onTap: _selectTab,
      ),
    );
  }
}
