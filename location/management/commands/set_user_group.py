from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group

class Command(BaseCommand):
    help = 'Sets a user to have only the user group permissions'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to modify')

    def handle(self, *args, **options):
        username = options['username']
        try:
            user = User.objects.get(username=username)
            # Remove all existing groups
            user.groups.clear()
            # Add only the user group
            user_group = Group.objects.get(name='user')
            user.groups.add(user_group)
            # Remove superuser status
            user.is_superuser = False
            user.is_staff = False
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully set user "{username}" to have only user group permissions'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User "{username}" does not exist'))
        except Group.DoesNotExist:
            self.stdout.write(self.style.ERROR('User group does not exist')) 